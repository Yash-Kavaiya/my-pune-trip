/**
 * Editorial content for the Katraj Zoo Park detail page.
 *
 * `ZOO_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/zoo/zoo-world.ts) — keep the ids in sync.
 */

export type ZooFeature = {
  id: "katraj-lake" | "snake-park" | "enclosure-trail" | "white-tiger" | "orphanage";
  title: string;
  marathi: string;
  icon: string;
  blurb: string;
  detail: string;
};

export const ZOO_FEATURES: ZooFeature[] = [
  {
    id: "katraj-lake",
    title: "Katraj Lake",
    marathi: "कात्रज तलाव · Kātraj talāv",
    icon: "droplets",
    blurb: "Forty-two acres of water on the campus — the zoo is built around this lake, not beside a city pond.",
    detail:
      "Katraj Lake is part of the zoo, not a neighbour. About 42 acres of it sit inside the 130-acre PMC campus: a real water body with a walking edge, birds, and a monsoon rise. This is not a garden canal and not the Khadakwasla reservoir. Walk the trail far enough and the woods open onto water — that is how the real park is arranged.",
  },
  {
    id: "snake-park",
    title: "The snake park",
    marathi: "सर्प उद्यान · Sarpa udyān",
    icon: "snake",
    blurb: "A distinct hall of glass terrariums — cobras, pythons and kraits, older than the 1999 zoo itself.",
    detail:
      "The snake park is its own volume, near the gate and apart from the big-cat paddocks. Pune’s snake park predates the Rajiv Gandhi zoo; when the 1999 campus opened it was folded in, not demolished. You walk a dim hall of glass, not a wooded trail. Do not tap the glass. The 3D model keeps it as a built block with lit cases, because that is how it reads on the ground.",
  },
  {
    id: "enclosure-trail",
    title: "The enclosure trail",
    marathi: "प्राणी मार्ग · Prāṇī mārg",
    icon: "route",
    blurb: "A long wooded walk past open enclosures — deer, birds, bears — the zoo proper, not a flower lawn.",
    detail:
      "Most of a visit is this loop: a path through trees, fences on either side, animals in large paddocks rather than cages. The campus is 130 acres; the battery vehicle exists because the walk is real. The model is a wooded enclosure trail, not Empress Garden’s picnic lawn and not Okayama’s water channels.",
  },
  {
    id: "white-tiger",
    title: "The white-tiger paddock",
    marathi: "पांढरा वाघ · Pāṇḍhrā vāgh",
    icon: "paw-print",
    blurb: "The signature large-cat enclosure — white tigers and other big cats in a fenced woodland paddock.",
    detail:
      "Katraj is known for its white tigers. Their enclosure is a large fenced paddock on the zoo trail, well away from the snake-park hall. You watch from the path; you do not go in. The model puts stylized cats in a roomy paddock so the campus reads as a zoo, not a memorial plaza or a rose garden.",
  },
  {
    id: "orphanage",
    title: "The animal orphanage",
    marathi: "अनाथालय · Anāthālay",
    icon: "house",
    blurb: "The third part of the campus — smaller rehab pens for injured and rescued animals.",
    detail:
      "Wikipedia’s three-part split is the right map: zoo, snake park, orphanage, plus the lake. The orphanage is a quieter cluster of sheds and pens near the gate, where rescued and injured animals are kept. It is not a visitor theatre. It is why the campus is also a wildlife research centre, not only a Sunday outing.",
  },
];

export const ZOO_STATS: { label: string; value: string; note: string }[] = [
  { label: "Opened", value: "14 Mar 1999", note: "PMC campus in Katraj, south Pune" },
  { label: "Grounds", value: "130 acres", note: "Zoo + snake park + orphanage" },
  { label: "The lake", value: "42 acres", note: "Katraj Lake sits on the campus" },
  { label: "Closed", value: "Wednesday", note: "Every week — plan around it" },
];

export const ZOO_STORY: { heading: string; body: string }[] = [
  {
    heading: "A municipal zoo around a lake",
    body:
      "Rajiv Gandhi Zoological Park — Katraj Zoo, Pune Zoo — opened on 14 March 1999 as a Pune Municipal Corporation project in Katraj, on the southern edge of the city. The 130-acre campus took in the older snake park and an animal orphanage and wrapped them around Katraj Lake. It is still run as a zoo and a wildlife research centre, not a decorative park.",
  },
  {
    heading: "Three parts, plus water",
    body:
      "You buy a ticket at the Satara Road gate and walk a wooded enclosure trail. Off to one side is the snake-park hall; off to another, the orphanage pens; the large-cat paddocks — including the white tigers the city talks about — sit on the trail. Keep walking and the trees open onto 42 acres of lake. That is the real plan of the place, and it is why the 3D model is a campus, not a single monument.",
  },
  {
    heading: "Wednesday is shut",
    body:
      "Official hours are 9:30 to 5:00 most of the year, 9:30 to 5:30 from April to mid-June. The gates close later than the last ticket. The zoo is closed every Wednesday. Do not feed the animals. Do not tap the glass. Carry water: one hundred and thirty acres is a long family afternoon.",
  },
];

export const ZOO_ETIQUETTE: string[] = [
  "Closed every Wednesday — confirm the day before you travel.",
  "Do not feed any animal, and do not tap or bang the snake-park glass.",
  "Stay on the visitor path; paddock fences are not climbing frames.",
  "Keep voices down at the large-cat enclosures and the orphanage.",
  "Photography is allowed; flash at the glass cases is unkind to the snakes.",
  "The campus is large — use the battery vehicle if you need it, and carry water.",
];

export const ZOO_FAQS: { q: string; a: string }[] = [
  {
    q: "Is Katraj Zoo the same as Rajiv Gandhi Zoological Park?",
    a: "Yes. The official name is Rajiv Gandhi Zoological Park and Wildlife Research Centre. Locals say Katraj Zoo or Pune Zoo. It is the PMC campus in Katraj, opened in 1999.",
  },
  {
    q: "Is the zoo open on Wednesday?",
    a: "No. It is closed every Wednesday. Other days it runs 9:30 AM to 5:00 PM (mid-June to March) or 9:30 AM to 5:30 PM (April to mid-June).",
  },
  {
    q: "What will I see besides animals?",
    a: "The campus is a zoo, a snake park and an animal orphanage, and it includes 42-acre Katraj Lake. The white-tiger paddock is the signature stop on the enclosure trail.",
  },
  {
    q: "How much does entry cost?",
    a: "About ₹60 for adults, ₹20 for children under 4 ft 4 in, and ₹150 for foreign nationals, plus optional camera and battery-vehicle tickets. Fees change — check the window or punezoo.in.",
  },
  {
    q: "How long should I spend here?",
    a: "Two to three hours covers the snake park, the large-cat paddocks and a walk to the lake. The grounds are 130 acres; families with small children often take the battery vehicle.",
  },
];
