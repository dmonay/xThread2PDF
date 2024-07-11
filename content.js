function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ src, width: img.width, height: img.height });
    img.onerror = reject;
    img.src = src;
  });
}

async function getThreadContent() {
  console.log("Getting thread content");

  // Wait for all tweets to load
  await new Promise((resolve) => {
    let checkInterval = setInterval(() => {
      if (
        !document.querySelector(
          '[aria-label="Loading more items in conversation"]'
        )
      ) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 500);
  });

  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  let threadContent = [];

  for (const tweet of tweets) {
    const text = tweet.querySelector('[data-testid="tweetText"]')?.innerText;
    const imageElements = tweet.querySelectorAll('img[alt="Image"]');
    const imagePromises = Array.from(imageElements).map((img) =>
      preloadImage(img.src)
    );
    const images = await Promise.all(imagePromises);

    threadContent.push({ text, images });
  }

  console.log(`Found ${threadContent.length} tweets`);
  return threadContent;
}

function showNotification(message, isSuccess) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      transition: opacity 0.5s ease-in-out;
    `;
  notification.style.backgroundColor = isSuccess ? "#4CAF50" : "#F44336";
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Received message in content script:", request);
  if (request.action === "getThreadContent") {
    getThreadContent()
      .then((threadContent) => {
        sendResponse({ success: true, threadContent: threadContent });
      })
      .catch((error) => {
        console.log("Error in content script:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indicates that we will send a response asynchronously
  } else if (request.action === "pdfGenerationResult") {
    if (request.result.success) {
      showNotification(`PDF saved as ${request.result.filename}`, true);
    } else {
      showNotification("Failed to generate PDF. Please try again.", false);
    }
  }
});

console.log("Content script loaded");
