function generatePDF(threadContent) {
  console.log("Generating PDF in background script");
  try {
    if (typeof jspdf === "undefined") {
      throw new Error("jsPDF library not loaded in background script");
    }
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yOffset = margin;

    doc.setFontSize(12);

    threadContent.forEach((tweet, index) => {
      if (tweet.text) {
        const textLines = doc.splitTextToSize(
          tweet.text,
          pageWidth - 2 * margin
        );

        if (yOffset + textLines.length * 5 > pageHeight - margin) {
          doc.addPage();
          yOffset = margin;
        }

        doc.text(textLines, margin, yOffset);
        yOffset += textLines.length * 5 + 5;
      }

      if (tweet.images.length > 0) {
        const maxImgHeight = 50;
        let xOffset = margin;
        let maxRowHeight = 0;

        tweet.images.forEach((img, imgIndex) => {
          const imgAspectRatio = img.width / img.height;
          let imgWidth = (pageWidth - 2 * margin) / 2; // Aim for 2 images per row
          let imgHeight = imgWidth / imgAspectRatio;

          if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = imgHeight * imgAspectRatio;
          }

          if (xOffset + imgWidth > pageWidth - margin) {
            yOffset += maxRowHeight + 5;
            xOffset = margin;
            maxRowHeight = 0;
          }

          if (yOffset + imgHeight > pageHeight - margin) {
            doc.addPage();
            yOffset = margin;
            xOffset = margin;
            maxRowHeight = 0;
          }

          doc.addImage(img.src, "JPEG", xOffset, yOffset, imgWidth, imgHeight);
          xOffset += imgWidth + 5;
          maxRowHeight = Math.max(maxRowHeight, imgHeight);

          if (imgIndex === tweet.images.length - 1) {
            yOffset += maxRowHeight + 5;
          }
        });
      }

      if (index < threadContent.length - 1) {
        if (yOffset > pageHeight - 20) {
          doc.addPage();
          yOffset = margin;
        }
        doc.setDrawColor(200);
        doc.line(margin, yOffset, pageWidth - margin, yOffset);
        yOffset += 5;
      }
    });

    const firstTweet = threadContent[0].text;
    const pdfName =
      firstTweet
        .slice(0, 30)
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase() + ".pdf";
    doc.save(pdfName);
    console.log("PDF generated and saved as", pdfName);
    return { success: true, filename: pdfName };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return { success: false, error: error.message };
  }
}

browser.browserAction.onClicked.addListener((tab) => {
  console.log("Extension icon clicked");
  browser.tabs
    .sendMessage(tab.id, { action: "getThreadContent" })
    .then((response) => {
      if (response.success) {
        const result = generatePDF(response.threadContent);
        browser.tabs.sendMessage(tab.id, {
          action: "pdfGenerationResult",
          result: result
        });
      } else {
        console.error("Error getting thread content:", response.error);
      }
    })
    .catch((error) => {
      console.error("Error in background script:", error);
    });
});

console.log("Background script loaded");
