/**
 * The components of the Party and of the Catalog as specimens. People are
 * named by the data of a screen; a specimen has none, so its two members are
 * named by their roles: the words "organizer" and "participant".
 */
import { format } from '../../directions/shared/data.js';
import { icons } from '../icons.js';
import { lineMap } from '../parts/map.js';
import {
  chat,
  composer,
  faces,
  memberRow,
  members,
  partyOption,
  recap,
  review,
  stars,
} from '../parts/party.js';
import { figures } from '../parts/route.js';
import { T } from '../strings.js';

/** A solid page behind a specimen. @param {string} inner */
const page = (inner) => `<div class="tt-on-page">${inner}</div>`;

/** Two members to show a component with: named by their role, not by a person. @param {'ru' | 'en'} lang */
const sample = (lang) => {
  const t = T[lang];
  return [
    { name: { ru: t.organizer, en: t.organizer } },
    { name: { ru: t.participant, en: t.participant } },
  ];
};

const sign = new URL('../mark/sign.svg', import.meta.url).pathname;

/** @type {import('../specimens.js').Specimen[]} */
export const partySpecimens = [
  {
    id: 'members',
    group: 'Party and Catalog',
    title: 'The members of a Party',
    note: 'A member is a disc with the first letter of the name. In a list each has what is known of them now and a mark that is always a word: “here”, “on the way”. The two members are named by their roles; people’s names come with the data of a screen.',
    height: 190,
    grows: true,
    render: ({ lang }) => {
      const t = T[lang];
      const [a, b] = sample(lang);
      return page(
        `${faces([a, b], lang, t.partyName)}<div class="tt-gap"></div>${members(t.partyName, [
          memberRow(a, lang, { note: t.onTime, mark: `${icons.check}${t.sent}`, is: 'ok' }),
          memberRow(b, lang, { note: t.waiting, mark: `${icons.walk}${t.next}`, is: 'wait' }),
        ])}`,
      );
    },
  },
  {
    id: 'party-option',
    group: 'Party and Catalog',
    title: 'A Route offered to a Party',
    note: 'One line on what is in it for whom, in the guide’s italic, and a tag per member; no chart and no matrix (PTY-8). Once the Party votes, two keys with words and a count (PTY-10). The Route is the reference Outing; the tags are samples.',
    height: 260,
    grows: true,
    render: ({ data, lang }) => {
      const t = T[lang];
      const [a, b] = sample(lang);
      return page(
        partyOption(lang, {
          name: t.guided,
          line: data.stops[0].why[lang],
          route: data.route,
          stops: data.stops,
          times: `${data.route.start} — ${data.route.finish}`,
          facts: `${t.places(data.route.stopCount)} · ${format.distance(data.route.walkingMetres, lang)}`,
          tags: [
            { member: a, got: t.themes[0] },
            { member: b, got: t.themes[2] },
          ],
          chosen: true,
          vote: { mine: 'for', for: 2, against: 0, labels: t.voteLabels },
        }),
      );
    },
  },
  {
    id: 'chat',
    group: 'Party and Catalog',
    title: 'The Chat of a Party',
    note: 'Messages, a reaction, and what the system says, set apart in the middle (PTY-13). Under it, where one writes: without a network it keeps its place and says why it cannot be used (OUT-15). The lines are samples of the form, not messages.',
    height: 330,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      const [a] = sample(lang);
      return `<div class="tt-under tt-under-page"></div><div class="tt-on-chat">${chat(
        lang,
        [
          { event: t.recalculated },
          { from: a, text: t.kicker, at: data.route.checkedAt, reaction: '2' },
          { text: t.onTime, at: data.route.nowBeforeStart, mine: true },
        ],
        t.chat,
      )}</div>${composer({ hint: t.chat, send: t.say.send })}`;
    },
  },
  {
    id: 'review',
    group: 'Party and Catalog',
    title: 'A rating shown, and a Review',
    note: 'A rating that is shown is a number and five stars; the number is what is read. A Review is words a person wrote, so it is set as the page is; its control leads to a Complaint (FBK-4). The text is a sample of the form.',
    height: 190,
    grows: true,
    render: ({ lang, data }) => {
      const t = T[lang];
      const [, b] = sample(lang);
      return page(
        `${stars(4.6, t.rateSay(5))}<div class="tt-gap"></div>${review(lang, {
          member: b,
          date: format.date(data.outingNow.story[lang].source.revision_date, lang),
          rating: 4,
          say: t.rateSay(4),
          text: t.emptyNote,
          more: t.say.more,
        })}`,
      );
    },
  },
  {
    id: 'recap',
    group: 'Party and Catalog',
    title: 'The Recap',
    note: 'One card made to be saved or posted (OUT-21): the walked line, the name of the product, what was asked for, the measures. No award and no streak.',
    height: 560,
    grows: true,
    render: ({ data, lang, theme }) => {
      const t = T[lang];
      return page(
        recap({
          map: lineMap(data, { lang, theme, size: 300, walked: true }),
          mark: sign,
          kicker: t.kicker,
          title: t.title,
          figures: figures([
            { label: t.out, value: data.route.start },
            { label: t.back, value: data.route.finish },
          ]),
        }),
      );
    },
  },
];
