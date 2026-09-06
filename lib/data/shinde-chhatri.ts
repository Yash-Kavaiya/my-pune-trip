/**
 * Editorial content for the Shinde Chhatri detail page.
 *
 * `CHHATRI_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/chhatri/chhatri-world.ts) — the HTML feature list and
 * the WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type ChhatriFeature = {
  id:
    | "chhatri-hall"
    | "domes"
    | "jharokhas"
    | "stained-glass"
    | "shiva-temple"
    | "samadhi";
  title: string;
  /** Marathi term for the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const CHHATRI_FEATURES: ChhatriFeature[] = [
  {
    id: "chhatri-hall",
    title: "The chhatri hall",
    marathi: "शिंदे छत्री सभागृह · Śinde Chhatrī sabhāgṛha",
    icon: "landmark",
    blurb: "A yellow-sandstone Indo-Rajasthani memorial hall standing on Mahadji’s 1794 cremation ground.",
    detail:
      "The hall is the building every photograph of Wanowrie leads with: two storeys of pale yellow sandstone, arched corridors on the ground floor, and a gallery inside hung with paintings and photographs of the Shinde / Scindia family. It is not a Peshwa wada and not an Italianate palace. Maharaja Madho Rao Scindia of Gwalior commissioned it; the Bombay firm of Shapurjee N. Chandabhoy drew the Anglo-Rajasthani design. Walk the arcade first, then step inside — this is the memorial pavilion, the chhatri itself.",
  },
  {
    id: "domes",
    title: "The cluster of domes",
    marathi: "घुमट · Ghumaṭ",
    icon: "sparkles",
    blurb: "A large central onion dome ringed by smaller roof chhatris — the silhouette that reads from the gate.",
    detail:
      "Rajasthani memorials are crowned with chhatris, the little domed pavilions that give this place its name. Here a bulbous central dome sits over the hall, with smaller onion domes at the corners and along the parapet. Brass kalash finials catch the sun. From the Wanowrie gate the cluster is the first thing you see, and it is what keeps the building from being mistaken for a cantonment bungalow or a Deccan temple.",
  },
  {
    id: "jharokhas",
    title: "The jharokha balconies",
    marathi: "झरोका · Jharokā",
    icon: "house",
    blurb: "Projecting first-floor balconies in the Rajput manner, shading the arcade below.",
    detail:
      "The first floor pushes out in enclosed jharokhas — stone balconies with their own little roofs, the device Rajasthani palaces use to watch a street without being seen. At Shinde Chhatri they sit over the arched corridor and break the long yellow front into bays. They are not Italianate loggias and not Maratha wooden galleries; they are the Rajasthani half of the Anglo-Rajasthani mix.",
  },
  {
    id: "stained-glass",
    title: "The English stained glass",
    marathi: "रंगीत काच · Raṅgīt kāch",
    icon: "palette",
    blurb: "Coloured window-panes in the English style — the Anglo half of the memorial.",
    detail:
      "The windows are not jali screens. They are English church-style lights: rectangular frames divided into small panes of ruby, cobalt, amber and green glass. Afternoon sun throws colour across the hall floor; at dusk the panes glow from inside. Restoration notes still talk of replacing the old English panes with new ones — they are a defining, slightly surprising, detail of a Rajasthani memorial in a British cantonment.",
  },
  {
    id: "shiva-temple",
    title: "The Shiva temple",
    marathi: "शिवालय · Śivālaya",
    icon: "flame",
    blurb: "Behind the hall: a yellow-stone carved steeple over a black-stone base and sanctum.",
    detail:
      "Mahadji built this temple himself in 1794, the same year he died. It sits behind the later memorial hall, not in front of it. The steeple is yellow stone, carved with small figures of saints; the base and the sanctum are black stone — the contrast is the thing to look for. This is a working shrine, older than the palace-like chhatri, and the reason the cremation ground already felt sacred when the last rites were performed.",
  },
  {
    id: "samadhi",
    title: "Mahadji’s samadhi",
    marathi: "महादजी समाधी · Mahādajī samādhī",
    icon: "umbrella",
    blurb: "The 1910 memorial on the exact cremation spot, outside the Shiva sanctum.",
    detail:
      "In 1910 a samadhi was raised outside the sanctum of the Shiva temple, on the ground where Mahadji Shinde was cremated on 12 February 1794. It is a low stone memorial at the temple, not a free-standing column on a parade lawn. Stand here and the sequence of the site is clear: he built the temple, he was cremated beside it, and the yellow hall in front was added later so the place would be remembered as a chhatri.",
  },
];

export const CHHATRI_STATS: { label: string; value: string; note: string }[] = [
  { label: "Cremation", value: "12 Feb 1794", note: "Mahadji Shinde’s last rites on this ground" },
  { label: "Temple", value: "1794", note: "Shiva shrine Mahadji raised before he died" },
  { label: "Samadhi", value: "1910", note: "Built outside the sanctum on the cremation spot" },
  { label: "Chhatri", value: "Umbrella", note: "Close yours on the premises — that is the rule" },
];

export const CHHATRI_STORY: { heading: string; body: string }[] = [
  {
    heading: "The cremation ground of 1794",
    body:
      "Mahadji Shinde — Mahadaji Scindia — was commander-in-chief of the Maratha army under the Peshwas and the man who restored Maratha power in the north after Panipat. He died in Wanowrie on 12 February 1794. His last rites were performed here, beside a Shiva temple he had just built. The complex of 1794 was that temple and a cremation ground, not the palace-like hall visitors photograph today.",
  },
  {
    heading: "A Scindia memorial in a British cantonment",
    body:
      "The present chhatri hall was commissioned by Maharaja Madho Rao Scindia of Gwalior, a descendant through Daulat Rao, Mahadji’s adopted son. The architects were Shapurjee N. Chandabhoy of Bombay. In 1910 the samadhi was added outside the Shiva sanctum, on the exact cremation spot. The Shinde Devasthan Trust, Gwalior, still tends the precinct. It is a Maratha memorial sitting inside Pune Cantonment — which is why the stone is Rajasthani and the window glass is English.",
  },
  {
    heading: "Yellow sandstone, black sanctum, closed umbrellas",
    body:
      "What you walk is three volumes in a line. In front, the yellow-sandstone hall: clustered onion domes, jharokha balconies, arched corridors, and those coloured English panes. Behind it, the older Shiva temple — yellow carved steeple, black-stone base and sanctum. At the temple, the samadhi. Chhatri means umbrella in Marathi. As a sign of respect, visitors close their umbrellas inside the premises, even when it is raining. That rule is not a tourist flourish; it is how the name of the place is honoured.",
  },
];

export const CHHATRI_ETIQUETTE: string[] = [
  "Chhatri means umbrella — close yours at the gate, even if it is raining.",
  "This is both a memorial and a living Shiva temple: dress modestly and keep voices low at the samadhi.",
  "Remove footwear before entering the temple sanctum.",
  "Do not sit on the samadhi platform or climb the jharokhas.",
  "Photography is welcome on the grounds and of the hall; be respectful inside the shrine.",
  "The small Vitthala and Hanuman shrines on the compound are working shrines — treat them as such.",
];

export const CHHATRI_FAQS: { q: string; a: string }[] = [
  {
    q: "Who was Mahadji Shinde, and why is the memorial in Wanowrie?",
    a: "Mahadji Shinde (Mahadaji Scindia) was the Maratha commander-in-chief under the Peshwas. He died in Wanowrie on 12 February 1794 and was cremated on this ground. The chhatri marks that spot.",
  },
  {
    q: "Why must visitors close their umbrellas?",
    a: "Chhatri means umbrella in Marathi. Closing yours on the premises is the traditional sign of respect to Mahadji and to the memorial that bears that name — even when it is raining.",
  },
  {
    q: "What is the building behind the yellow hall?",
    a: "A Shiva temple Mahadji built in 1794. The steeple is carved yellow stone; the base and sanctum are black stone. His samadhi stands outside that sanctum, on the cremation spot.",
  },
  {
    q: "Is Shinde Chhatri the same as Shinde Chatri?",
    a: "Yes. Chhatri and Chatri are the same Marathi word (छत्री). You will see both spellings on maps and tickets. The place is in Wanowrie, also written Wanawadi, in the Pune Cantonment.",
  },
  {
    q: "How long should I spend here, and what does it cost?",
    a: "Forty-five minutes to an hour covers the hall, the stained glass, the temple and the samadhi. Entry is about ₹20 for Indians and ₹200 for foreign nationals; timings are 6:00 AM to 9:00 PM. Confirm at the ticket window — fees change.",
  },
];
