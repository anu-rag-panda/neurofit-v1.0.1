// Google Apps Script code
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var recipient = data.email;
  var subject = data.subject;
  var body = data.body;
  MailApp.sendEmail(recipient, subject, body);
  return ContentService.createTextOutput(JSON.stringify({status: "Email sent"}))
    .setMimeType(ContentService.MimeType.JSON);
}