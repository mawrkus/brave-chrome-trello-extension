import { HttpClient } from './HttpClient.js';
import { Menus } from './Menus.js';
import { Notifier } from './Notifier.js';
import { Scripting } from './Scripting.js';
import { Storage } from './Storage.js';
import { TrelloHttpRepository } from './TrelloHttpRepository.js';

const notifier = new Notifier();
const scripting = new Scripting();

const trelloRepository = new TrelloHttpRepository({
  httpClient: new HttpClient({
    baseUrl: 'https://api.trello.com',
    storage: new Storage(),
  }),
});

const menus = new Menus({
  onClickRefreshAllBoards: createAllMenus,
  onClickRefreshBoardLists: (board) => createBoardMenu(board, true),
  onClickList: addCardToList,
});

async function createBoardMenu(board, refresh = false) {
  let lists = null;

  try {
    lists = await trelloRepository.getBoardLists(board);
  } catch (error) {
    notifier.error({
      type: 'Load Error',
      message: `Error loading "${board.name}" lists: ${error.message}`,
    });

    return;
  }

  if (refresh) {
    await menus.removeBoard(board.id);

    menus.addBoard(board, lists);

    notifier.success({
      message: `"${board.name}" → ${lists.length} lists successfully loaded!`,
    });

    return;
  }

  menus.addBoard(board, lists);
}

async function createAllMenus() {
  let boards = null;

  try {
    boards = await trelloRepository.getBoards();
  } catch (error) {
    notifier.error({
      type: 'Load Error',
      message: `Error loading boards: ${error.message}!`,
    });

    return;
  }

  await menus.removeAll();

  menus.createDefault();

  for (const board of boards) {
    await createBoardMenu(board);
  }

  notifier.success({
    message: `${boards.length} boards successfully loaded!`,
  });
}

async function buildCardAndCoverData(onClickData, tab, list) {
  const { selectionText } = onClickData;
  const { id: tabId, url: pageUrl, title: pageTitle } = tab;

  const htmlMetas = await scripting
    .executeScript(tabId, './background/injection-scripts/getHtmlMetas.js')
    .catch(() => ({ description: '', imageUrl: null }));

  const desc = htmlMetas.description
    ? `${htmlMetas.description} (...)`
    : 'No description available.';

  return {
    card: {
      idList: list.id,
      urlSource: pageUrl,
      name: selectionText || pageTitle,
      desc: `${desc}\n\n🔗 Source: ${pageUrl}`,
      pos: 'top',
    },
    cover: htmlMetas.imageUrl
      ? {
        name: 'Cover',
        url: htmlMetas.imageUrl,
        setCover: true,
      }
      : null,
  };
}

async function addCardToList(onClickData, tab, board, list) {
  const { card, cover } = await buildCardAndCoverData(onClickData, tab, list);

  try {
    const newCard = await trelloRepository.createCard(card, cover);

    notifier.success({
      message: `New card successfully added to ${board.name} → ${list.name}!`,
      clickUrl: newCard.url,
    });
  } catch (error) {
    notifier.error({
      type: 'Create Card Error',
      message: `Error while creating new card: ${error.message}!`,
    });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed.');

  await menus.createDefault();
});
