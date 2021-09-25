// eslint-disable-next-line no-unused-vars
class Notifier {
  constructor() {
    this.notifications = chrome.notifications;
    this.tabs = chrome.tabs;

    this.idsToUrlsMap = {};
    this.bindEvents();

    console.log('Notifier', this);
  }

  bindEvents() {
    this.notifications.onClicked.addListener((notificationId) => {
      console.log('Clicked on notification ID="%s"', notificationId, this.idsToUrlsMap);

      if (this.idsToUrlsMap[notificationId]) {
        this.tabs.create({ url: this.idsToUrlsMap[notificationId].url });
        delete this.idsToUrlsMap[notificationId];
      }
    });

    this.notifications.onClosed.addListener((notificationId, byUser) => {
      console.log('Notification with ID="%s" closed', notificationId, byUser, this.idsToUrlsMap);
      delete this.idsToUrlsMap[notificationId];
    });
  }

  success({ message, clickUrl }) {
    console.log(message, clickUrl);

    const options = {
      type: 'basic',
      iconUrl: './icons/trello-logo-96.png',
      title: 'Trello Card',
      message,
    };

    // unique ID required by Chrome
    this.notifications.create(`success-${Date.now()}`, options, (notificationId) => {
      if (clickUrl) {
        this.idsToUrlsMap[notificationId] = { url: clickUrl };
      }
    });
  }

  error({ type, message }) {
    console.error(type, message);

    // unique ID required by Chrome
    this.notifications.create(`error-${Date.now()}`, {
      type: 'basic',
      iconUrl: './icons/trello-logo-96-grey.png',
      title: `Trello Card ${type}`,
      message,
    });
  }
}
