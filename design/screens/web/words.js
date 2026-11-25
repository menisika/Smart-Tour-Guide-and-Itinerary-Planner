/**
 * The words of the public web that the phone's screens do not already have,
 * in Russian and in English. Product words are in sentence case. No name of
 * a Place, of a person or of a city appears here: those come from the data.
 */
import { format } from '../../directions/shared/data.js';

const d = format.duration;

export const WB = {
  ru: {
    signIn: 'Войти',
    takeCopy: 'Взять копию',
    takeCopyNote: 'станет вашим маршрутом',
    listen: 'Слушать рассказы',
    listenNote: 'включаются вручную',
    routeGone: 'Маршрут недоступен',
    routeGoneNote: 'Ссылка устарела, или автор убрал маршрут. Попросите новую ссылку.',
    planOwn: 'Собрать свой маршрут',
    routeLoading: 'Открываем маршрут',
    // ── The Invitation ────────────────────────────────────────────────────
    invitation: 'Приглашение',
    invites: (/** @type {string} */ name) => `${name} зовёт на прогулку`,
    about: (/** @type {number} */ hours) => `около ${d(hours * 60, 'ru')}`,
    meetingPoint: 'Точка сбора',
    answeredOf: (/** @type {number} */ a, /** @type {number} */ b) => `ответили ${a} из ${b}`,
    yourName: 'Как вас зовут',
    likes: 'Что вам нравится',
    never: 'Чего точно не надо',
    neverNote: 'Запрет действует на весь маршрут — для всей компании',
    wishOptional: 'Пожелание — если хочется',
    wishOptionalHint: 'Например: «хочу в парк», «не спешить»',
    answer: 'Ответить',
    answerNote:
      'Без установки и аккаунта. Ответы хранятся с этой прогулкой и удалятся вместе с ней.',
    answered: 'Ответ принят',
    answeredNote:
      'Когда ответят остальные, здесь появятся варианты маршрута — эту страницу можно открыть снова.',
    whoAnswered: 'Компания',
    organizer: 'организатор',
    hasAnswered: 'ответил(а)',
    notYet: 'ещё не ответил(а)',
    you: 'вы',
    emailOptional: 'Почта — по желанию',
    emailNote: 'Пришлём выбранный маршрут и напоминание. Больше ничего.',
    changeAnswer: 'Изменить ответ',
    linkGone: 'Эта ссылка больше не действует',
    linkGoneNote: 'Организатор заменил приглашение. Попросите у него новую ссылку.',
    // ── The request, in a browser ─────────────────────────────────────────
    newOuting: 'Новая прогулка',
    newOutingNote: 'Маршрут и рассказы — в браузере. Сами по прибытии и без сети — в приложении.',
    // ── A Story by hand ───────────────────────────────────────────────────
    // ── What a messenger shows ────────────────────────────────────────────
    chatName: 'Суббота',
    chatPeople: (/** @type {number} */ n) => `${n} участников`,
    openShort: 'В приложение',
    chatAsk: 'Кто свободен в субботу?',
    chatYes: 'Я за',
    chatRoute: 'Нашла маршрут на субботу, смотрите',
    chatInvite: 'Собираемся в субботу. Ответьте, кому что интересно',
    previewRoute: 'Маршрут',
    previewRouteText: 'Маршрут с рассказом о каждом месте. Открывается в браузере, без установки.',
    previewInviteText:
      'Ответьте за минуту — что нравится и чего не надо. Без установки и аккаунта.',
    previewNote: 'Рамка — мессенджера; наше в ней — картинка, заголовок, строка и адрес.',
  },
  en: {
    signIn: 'Sign in',
    takeCopy: 'Take a copy',
    takeCopyNote: 'it becomes your route',
    listen: 'Listen to the stories',
    listenNote: 'you start each yourself',
    routeGone: 'This route is not available',
    routeGoneNote:
      'The link is out of date, or the author took the route down. Ask for a new link.',
    planOwn: 'Plan a route of your own',
    routeLoading: 'Opening the route',
    invitation: 'Invitation',
    invites: (/** @type {string} */ name) => `${name} invites you to an outing`,
    about: (/** @type {number} */ hours) => `about ${d(hours * 60, 'en')}`,
    meetingPoint: 'Meeting point',
    answeredOf: (/** @type {number} */ a, /** @type {number} */ b) => `${a} of ${b} have answered`,
    yourName: 'Your name',
    likes: 'What you like',
    never: 'What you rule out',
    neverNote: 'A dealbreaker holds for the whole route — for the whole party',
    wishOptional: 'A wish — if you have one',
    wishOptionalHint: 'For example: “a park, please”, “no hurry”',
    answer: 'Answer',
    answerNote:
      'No installation, no account. Your answers are kept with this outing and deleted with it.',
    answered: 'Your answer is in',
    answeredNote:
      'When the others have answered, the route options appear here — you can open this page again.',
    whoAnswered: 'The party',
    organizer: 'organizer',
    hasAnswered: 'has answered',
    notYet: 'has not answered yet',
    you: 'you',
    emailOptional: 'E-mail — if you like',
    emailNote: 'We send the chosen route and a reminder. Nothing else.',
    changeAnswer: 'Change my answer',
    linkGone: 'This link no longer works',
    linkGoneNote: 'The organizer replaced the invitation. Ask them for a new link.',
    newOuting: 'A new outing',
    newOutingNote:
      'The route and the stories work in a browser. Starting by themselves and without a network — in the app.',
    chatName: 'Saturday',
    chatPeople: (/** @type {number} */ n) => `${n} members`,
    openShort: 'Get the app',
    chatAsk: 'Who is free on Saturday?',
    chatYes: 'I am in',
    chatRoute: 'Found a route for Saturday, have a look',
    chatInvite: 'Saturday is on. Say what you would like to see',
    previewRoute: 'Route',
    previewRouteText:
      'A route with a story at every place. Opens in a browser, nothing to install.',
    previewInviteText:
      'Answer in a minute — what you like and what you rule out. No installation, no account.',
    previewNote:
      'The frame is the messenger’s; ours are the picture, the title, the line and the address.',
  },
};
