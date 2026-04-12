import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { DEVOS_EMOJI_LIST } from "../lib/devosEmoji";

/* ── Emoji data ────────────────────────────────────────────────────────────── */
interface EmojiEntry { emoji: string; name: string }
interface Category  { id: string; icon: string; label: string; emojis: EmojiEntry[] }

const CATEGORIES: Category[] = [
  {
    id: "devos", icon: "⚡", label: "DevOS",
    emojis: DEVOS_EMOJI_LIST.map(({ code, value }) => ({ emoji: value, name: code.replace(/:/g, "") })),
  },
  {
    id: "smileys", icon: "😀", label: "Smileys",
    emojis: [
      { emoji: "😀", name: "grinning" }, { emoji: "😃", name: "smiley" }, { emoji: "😄", name: "smile" },
      { emoji: "😁", name: "grin" }, { emoji: "😆", name: "laughing" }, { emoji: "😅", name: "sweat smile" },
      { emoji: "🤣", name: "rolling on floor laughing" }, { emoji: "😂", name: "joy" }, { emoji: "🙂", name: "slightly smiling" },
      { emoji: "😊", name: "blush" }, { emoji: "😇", name: "innocent" }, { emoji: "🥰", name: "smiling hearts" },
      { emoji: "😍", name: "heart eyes" }, { emoji: "🤩", name: "star struck" }, { emoji: "😘", name: "kissing heart" },
      { emoji: "😗", name: "kissing" }, { emoji: "😚", name: "kissing closed eyes" }, { emoji: "😋", name: "yum" },
      { emoji: "😛", name: "stuck out tongue" }, { emoji: "😜", name: "winking tongue" }, { emoji: "🤑", name: "money mouth" },
      { emoji: "🤗", name: "hugging" }, { emoji: "🤭", name: "hand over mouth" }, { emoji: "🤫", name: "shushing" },
      { emoji: "🤔", name: "thinking" }, { emoji: "🤐", name: "zipper mouth" }, { emoji: "😶", name: "no mouth" },
      { emoji: "😑", name: "expressionless" }, { emoji: "😬", name: "grimacing" }, { emoji: "🙄", name: "eye roll" },
      { emoji: "😯", name: "hushed" }, { emoji: "😲", name: "astonished" }, { emoji: "😳", name: "flushed" },
      { emoji: "🥺", name: "pleading" }, { emoji: "😦", name: "frowning open" }, { emoji: "😧", name: "anguished" },
      { emoji: "😨", name: "fearful" }, { emoji: "😰", name: "cold sweat" }, { emoji: "😢", name: "cry" },
      { emoji: "😭", name: "loudly crying" }, { emoji: "😱", name: "scream" }, { emoji: "😖", name: "confounded" },
      { emoji: "😣", name: "persevere" }, { emoji: "😞", name: "disappointed" }, { emoji: "😓", name: "downcast sweat" },
      { emoji: "😩", name: "weary" }, { emoji: "😫", name: "tired" }, { emoji: "🥱", name: "yawning" },
      { emoji: "😤", name: "steam nose" }, { emoji: "😡", name: "pouting" }, { emoji: "😠", name: "angry" },
      { emoji: "🤬", name: "cursing" }, { emoji: "😈", name: "smiling devil" }, { emoji: "👿", name: "angry devil" },
      { emoji: "💀", name: "skull" }, { emoji: "☠️", name: "skull crossbones" }, { emoji: "🤡", name: "clown" },
      { emoji: "👹", name: "ogre" }, { emoji: "👺", name: "goblin" }, { emoji: "👻", name: "ghost" },
      { emoji: "👽", name: "alien" }, { emoji: "🤖", name: "robot" }, { emoji: "😺", name: "smiley cat" },
      { emoji: "😸", name: "grinning cat" }, { emoji: "😻", name: "heart eyes cat" }, { emoji: "💯", name: "hundred" },
      { emoji: "💢", name: "anger" }, { emoji: "💥", name: "collision" }, { emoji: "💫", name: "dizzy" },
      { emoji: "💦", name: "sweat droplets" }, { emoji: "💨", name: "dashing away" }, { emoji: "🕳️", name: "hole" },
      { emoji: "💬", name: "speech bubble" }, { emoji: "💭", name: "thought bubble" }, { emoji: "💤", name: "zzz" },
    ],
  },
  {
    id: "people", icon: "👋", label: "People",
    emojis: [
      { emoji: "👋", name: "waving hand" }, { emoji: "🤚", name: "raised back hand" }, { emoji: "✋", name: "raised hand" },
      { emoji: "🖖", name: "vulcan salute" }, { emoji: "👌", name: "ok hand" }, { emoji: "✌️", name: "victory hand" },
      { emoji: "🤞", name: "crossed fingers" }, { emoji: "🤟", name: "love you gesture" }, { emoji: "🤘", name: "sign of horns" },
      { emoji: "🤙", name: "call me hand" }, { emoji: "👈", name: "backhand index pointing left" }, { emoji: "👉", name: "backhand index pointing right" },
      { emoji: "👆", name: "backhand index pointing up" }, { emoji: "🖕", name: "middle finger" }, { emoji: "👇", name: "backhand index pointing down" },
      { emoji: "☝️", name: "index pointing up" }, { emoji: "👍", name: "thumbs up" }, { emoji: "👎", name: "thumbs down" },
      { emoji: "✊", name: "raised fist" }, { emoji: "👊", name: "oncoming fist" }, { emoji: "🤛", name: "left facing fist" },
      { emoji: "🤜", name: "right facing fist" }, { emoji: "👏", name: "clapping hands" }, { emoji: "🙌", name: "raising hands" },
      { emoji: "👐", name: "open hands" }, { emoji: "🤲", name: "palms up" }, { emoji: "🤝", name: "handshake" },
      { emoji: "🙏", name: "folded hands" }, { emoji: "✍️", name: "writing hand" }, { emoji: "💅", name: "nail polish" },
      { emoji: "🤳", name: "selfie" }, { emoji: "💪", name: "flexed biceps" }, { emoji: "🦾", name: "mechanical arm" },
      { emoji: "🦿", name: "mechanical leg" }, { emoji: "🦵", name: "leg" }, { emoji: "🦶", name: "foot" },
      { emoji: "👂", name: "ear" }, { emoji: "🦻", name: "ear with hearing aid" }, { emoji: "👃", name: "nose" },
      { emoji: "🧠", name: "brain" }, { emoji: "👀", name: "eyes" }, { emoji: "👅", name: "tongue" },
      { emoji: "👶", name: "baby" }, { emoji: "🧒", name: "child" }, { emoji: "👦", name: "boy" },
      { emoji: "👧", name: "girl" }, { emoji: "🧑", name: "person" }, { emoji: "👱", name: "blond person" },
      { emoji: "👨", name: "man" }, { emoji: "🧔", name: "bearded person" }, { emoji: "👩", name: "woman" },
      { emoji: "🧓", name: "older person" }, { emoji: "👴", name: "old man" }, { emoji: "👵", name: "old woman" },
      { emoji: "🙍", name: "person frowning" }, { emoji: "🙎", name: "person pouting" }, { emoji: "🙅", name: "person gesturing no" },
      { emoji: "🙆", name: "person gesturing ok" }, { emoji: "💁", name: "person tipping hand" }, { emoji: "🙋", name: "person raising hand" },
      { emoji: "🧏", name: "deaf person" }, { emoji: "🙇", name: "person bowing" }, { emoji: "🤦", name: "person facepalm" },
      { emoji: "🤷", name: "person shrugging" }, { emoji: "👮", name: "police officer" }, { emoji: "🕵️", name: "detective" },
      { emoji: "💂", name: "guard" }, { emoji: "👷", name: "construction worker" }, { emoji: "🤴", name: "prince" },
      { emoji: "👸", name: "princess" }, { emoji: "👳", name: "person wearing turban" }, { emoji: "👲", name: "person with skullcap" },
    ],
  },
  {
    id: "animals", icon: "🐱", label: "Animals",
    emojis: [
      { emoji: "🐶", name: "dog" }, { emoji: "🐱", name: "cat" }, { emoji: "🐭", name: "mouse" },
      { emoji: "🐹", name: "hamster" }, { emoji: "🐰", name: "rabbit" }, { emoji: "🦊", name: "fox" },
      { emoji: "🐻", name: "bear" }, { emoji: "🐼", name: "panda" }, { emoji: "🐨", name: "koala" },
      { emoji: "🐯", name: "tiger" }, { emoji: "🦁", name: "lion" }, { emoji: "🐮", name: "cow" },
      { emoji: "🐷", name: "pig" }, { emoji: "🐸", name: "frog" }, { emoji: "🐵", name: "monkey" },
      { emoji: "🐔", name: "chicken" }, { emoji: "🐧", name: "penguin" }, { emoji: "🐦", name: "bird" },
      { emoji: "🦆", name: "duck" }, { emoji: "🦅", name: "eagle" }, { emoji: "🦉", name: "owl" },
      { emoji: "🦇", name: "bat" }, { emoji: "🐺", name: "wolf" }, { emoji: "🐗", name: "boar" },
      { emoji: "🐴", name: "horse" }, { emoji: "🦄", name: "unicorn" }, { emoji: "🐝", name: "bee" },
      { emoji: "🐛", name: "bug" }, { emoji: "🦋", name: "butterfly" }, { emoji: "🐌", name: "snail" },
      { emoji: "🐞", name: "ladybug" }, { emoji: "🐜", name: "ant" }, { emoji: "🦟", name: "mosquito" },
      { emoji: "🦂", name: "scorpion" }, { emoji: "🐢", name: "turtle" }, { emoji: "🐍", name: "snake" },
      { emoji: "🦎", name: "lizard" }, { emoji: "🦖", name: "t-rex" }, { emoji: "🦕", name: "sauropod" },
      { emoji: "🐙", name: "octopus" }, { emoji: "🦑", name: "squid" }, { emoji: "🦐", name: "shrimp" },
      { emoji: "🦞", name: "lobster" }, { emoji: "🦀", name: "crab" }, { emoji: "🐡", name: "blowfish" },
      { emoji: "🐠", name: "tropical fish" }, { emoji: "🐟", name: "fish" }, { emoji: "🐬", name: "dolphin" },
      { emoji: "🐳", name: "whale" }, { emoji: "🦈", name: "shark" }, { emoji: "🐊", name: "crocodile" },
      { emoji: "🌸", name: "cherry blossom" }, { emoji: "🌹", name: "rose" }, { emoji: "🌻", name: "sunflower" },
      { emoji: "🌴", name: "palm tree" }, { emoji: "🌵", name: "cactus" }, { emoji: "🍄", name: "mushroom" },
    ],
  },
  {
    id: "food", icon: "🍕", label: "Food",
    emojis: [
      { emoji: "🍕", name: "pizza" }, { emoji: "🍔", name: "hamburger" }, { emoji: "🍟", name: "fries" },
      { emoji: "🌭", name: "hot dog" }, { emoji: "🌮", name: "taco" }, { emoji: "🌯", name: "burrito" },
      { emoji: "🥗", name: "salad" }, { emoji: "🥘", name: "paella" }, { emoji: "🍜", name: "noodles" },
      { emoji: "🍝", name: "spaghetti" }, { emoji: "🍛", name: "curry" }, { emoji: "🍣", name: "sushi" },
      { emoji: "🍱", name: "bento" }, { emoji: "🥟", name: "dumpling" }, { emoji: "🍤", name: "fried shrimp" },
      { emoji: "🍙", name: "rice ball" }, { emoji: "🍚", name: "rice" }, { emoji: "🍘", name: "rice cracker" },
      { emoji: "🍥", name: "fish cake" }, { emoji: "🥮", name: "moon cake" }, { emoji: "🍢", name: "oden" },
      { emoji: "🧆", name: "falafel" }, { emoji: "🥚", name: "egg" }, { emoji: "🍳", name: "cooking" },
      { emoji: "🥞", name: "pancakes" }, { emoji: "🧇", name: "waffle" }, { emoji: "🥓", name: "bacon" },
      { emoji: "🥩", name: "steak" }, { emoji: "🍗", name: "chicken" }, { emoji: "🍖", name: "meat on bone" },
      { emoji: "🦴", name: "bone" }, { emoji: "🌽", name: "corn" }, { emoji: "🌶️", name: "hot pepper" },
      { emoji: "🥦", name: "broccoli" }, { emoji: "🧄", name: "garlic" }, { emoji: "🧅", name: "onion" },
      { emoji: "🍎", name: "apple" }, { emoji: "🍊", name: "tangerine" }, { emoji: "🍋", name: "lemon" },
      { emoji: "🍇", name: "grapes" }, { emoji: "🍓", name: "strawberry" }, { emoji: "🍑", name: "peach" },
      { emoji: "🍒", name: "cherries" }, { emoji: "🍍", name: "pineapple" }, { emoji: "🥝", name: "kiwi" },
      { emoji: "🍦", name: "ice cream" }, { emoji: "🍰", name: "cake" }, { emoji: "🎂", name: "birthday cake" },
      { emoji: "🍩", name: "doughnut" }, { emoji: "🍪", name: "cookie" }, { emoji: "🍫", name: "chocolate" },
      { emoji: "🍬", name: "candy" }, { emoji: "🍭", name: "lollipop" }, { emoji: "☕", name: "coffee" },
      { emoji: "🍵", name: "tea" }, { emoji: "🧃", name: "juice box" }, { emoji: "🥤", name: "cup with straw" },
      { emoji: "🍺", name: "beer" }, { emoji: "🍻", name: "beers" }, { emoji: "🥂", name: "clinking glasses" },
    ],
  },
  {
    id: "activities", icon: "⚽", label: "Activities",
    emojis: [
      { emoji: "⚽", name: "soccer" }, { emoji: "🏀", name: "basketball" }, { emoji: "🏈", name: "football" },
      { emoji: "⚾", name: "baseball" }, { emoji: "🥎", name: "softball" }, { emoji: "🎾", name: "tennis" },
      { emoji: "🏐", name: "volleyball" }, { emoji: "🏉", name: "rugby" }, { emoji: "🥏", name: "flying disc" },
      { emoji: "🎱", name: "pool 8 ball" }, { emoji: "🏓", name: "ping pong" }, { emoji: "🏸", name: "badminton" },
      { emoji: "🥊", name: "boxing glove" }, { emoji: "🥋", name: "martial arts" }, { emoji: "🎯", name: "dart" },
      { emoji: "⛳", name: "golf" }, { emoji: "🏹", name: "bow and arrow" }, { emoji: "🎣", name: "fishing" },
      { emoji: "🤿", name: "diving mask" }, { emoji: "🎿", name: "skis" }, { emoji: "🛷", name: "sled" },
      { emoji: "🏂", name: "snowboarder" }, { emoji: "🏋️", name: "weight lifter" }, { emoji: "🤼", name: "wrestlers" },
      { emoji: "🤺", name: "fencer" }, { emoji: "🤾", name: "handball" }, { emoji: "🏊", name: "swimmer" },
      { emoji: "🚴", name: "cyclist" }, { emoji: "🏇", name: "horse racing" }, { emoji: "🧗", name: "climber" },
      { emoji: "🎮", name: "video game" }, { emoji: "🕹️", name: "joystick" }, { emoji: "🎲", name: "dice" },
      { emoji: "♟️", name: "chess" }, { emoji: "🃏", name: "joker card" }, { emoji: "🀄", name: "mahjong" },
      { emoji: "🎪", name: "circus tent" }, { emoji: "🎭", name: "performing arts" }, { emoji: "🎨", name: "art palette" },
      { emoji: "🎬", name: "clapper board" }, { emoji: "🎤", name: "microphone" }, { emoji: "🎧", name: "headphone" },
      { emoji: "🎵", name: "musical note" }, { emoji: "🎶", name: "musical notes" }, { emoji: "🎼", name: "musical score" },
      { emoji: "🥁", name: "drum" }, { emoji: "🎷", name: "saxophone" }, { emoji: "🎺", name: "trumpet" },
      { emoji: "🎸", name: "guitar" }, { emoji: "🎻", name: "violin" }, { emoji: "🎹", name: "piano" },
    ],
  },
  {
    id: "objects", icon: "💡", label: "Objects",
    emojis: [
      { emoji: "💡", name: "light bulb" }, { emoji: "🔦", name: "flashlight" }, { emoji: "🕯️", name: "candle" },
      { emoji: "💻", name: "laptop" }, { emoji: "🖥️", name: "desktop computer" }, { emoji: "🖨️", name: "printer" },
      { emoji: "⌨️", name: "keyboard" }, { emoji: "🖱️", name: "computer mouse" }, { emoji: "📱", name: "mobile phone" },
      { emoji: "📲", name: "mobile phone arrow" }, { emoji: "☎️", name: "telephone" }, { emoji: "📞", name: "telephone receiver" },
      { emoji: "📺", name: "television" }, { emoji: "📷", name: "camera" }, { emoji: "📸", name: "camera flash" },
      { emoji: "📹", name: "video camera" }, { emoji: "🎥", name: "movie camera" }, { emoji: "🔍", name: "magnifying glass" },
      { emoji: "🔎", name: "magnifying glass right" }, { emoji: "🕯️", name: "candle" }, { emoji: "💰", name: "money bag" },
      { emoji: "💳", name: "credit card" }, { emoji: "💎", name: "gem" }, { emoji: "⚙️", name: "gear" },
      { emoji: "🔧", name: "wrench" }, { emoji: "🔨", name: "hammer" }, { emoji: "⛏️", name: "pick" },
      { emoji: "🪛", name: "screwdriver" }, { emoji: "🔩", name: "nut and bolt" }, { emoji: "🪝", name: "hook" },
      { emoji: "🧲", name: "magnet" }, { emoji: "🔑", name: "key" }, { emoji: "🗝️", name: "old key" },
      { emoji: "🔐", name: "locked with key" }, { emoji: "🔒", name: "locked" }, { emoji: "🔓", name: "unlocked" },
      { emoji: "🛡️", name: "shield" }, { emoji: "⚔️", name: "crossed swords" }, { emoji: "🪤", name: "mouse trap" },
      { emoji: "📦", name: "package" }, { emoji: "📫", name: "mailbox" }, { emoji: "📝", name: "memo" },
      { emoji: "📋", name: "clipboard" }, { emoji: "📌", name: "pushpin" }, { emoji: "📍", name: "round pushpin" },
      { emoji: "✏️", name: "pencil" }, { emoji: "🖊️", name: "pen" }, { emoji: "🖋️", name: "fountain pen" },
      { emoji: "📏", name: "ruler" }, { emoji: "📐", name: "triangular ruler" }, { emoji: "✂️", name: "scissors" },
      { emoji: "🗃️", name: "card file box" }, { emoji: "🗂️", name: "card index dividers" }, { emoji: "🗄️", name: "file cabinet" },
    ],
  },
  {
    id: "symbols", icon: "❤️", label: "Symbols",
    emojis: [
      { emoji: "❤️", name: "red heart" }, { emoji: "🧡", name: "orange heart" }, { emoji: "💛", name: "yellow heart" },
      { emoji: "💚", name: "green heart" }, { emoji: "💙", name: "blue heart" }, { emoji: "💜", name: "purple heart" },
      { emoji: "🖤", name: "black heart" }, { emoji: "🤍", name: "white heart" }, { emoji: "💔", name: "broken heart" },
      { emoji: "❣️", name: "heart exclamation" }, { emoji: "💕", name: "two hearts" }, { emoji: "💞", name: "revolving hearts" },
      { emoji: "💓", name: "beating heart" }, { emoji: "💗", name: "growing heart" }, { emoji: "💖", name: "sparkling heart" },
      { emoji: "💘", name: "heart with arrow" }, { emoji: "💝", name: "heart with ribbon" }, { emoji: "💟", name: "heart decoration" },
      { emoji: "✅", name: "check mark" }, { emoji: "❌", name: "cross mark" }, { emoji: "❓", name: "question mark" },
      { emoji: "❗", name: "exclamation mark" }, { emoji: "⚠️", name: "warning" }, { emoji: "🚫", name: "prohibited" },
      { emoji: "🔴", name: "red circle" }, { emoji: "🟠", name: "orange circle" }, { emoji: "🟡", name: "yellow circle" },
      { emoji: "🟢", name: "green circle" }, { emoji: "🔵", name: "blue circle" }, { emoji: "🟣", name: "purple circle" },
      { emoji: "⚫", name: "black circle" }, { emoji: "⚪", name: "white circle" }, { emoji: "🟤", name: "brown circle" },
      { emoji: "🔺", name: "red triangle up" }, { emoji: "🔻", name: "red triangle down" }, { emoji: "💠", name: "diamond with dot" },
      { emoji: "🔷", name: "large blue diamond" }, { emoji: "🔶", name: "large orange diamond" }, { emoji: "▶️", name: "play button" },
      { emoji: "⏸️", name: "pause button" }, { emoji: "⏹️", name: "stop button" }, { emoji: "⏺️", name: "record button" },
      { emoji: "🔊", name: "speaker high volume" }, { emoji: "🔇", name: "muted speaker" }, { emoji: "🔔", name: "bell" },
      { emoji: "🔕", name: "bell with slash" }, { emoji: "🎵", name: "musical note" }, { emoji: "🎶", name: "musical notes" },
      { emoji: "♻️", name: "recycling" }, { emoji: "⭐", name: "star" }, { emoji: "🌟", name: "glowing star" },
      { emoji: "✨", name: "sparkles" }, { emoji: "💫", name: "dizzy" }, { emoji: "🔥", name: "fire" },
      { emoji: "💥", name: "explosion" }, { emoji: "🌈", name: "rainbow" }, { emoji: "☀️", name: "sun" },
      { emoji: "🌙", name: "moon" }, { emoji: "⚡", name: "lightning" }, { emoji: "❄️", name: "snowflake" },
      { emoji: "🌊", name: "wave" }, { emoji: "🎉", name: "party" }, { emoji: "🎊", name: "confetti ball" },
      { emoji: "🎁", name: "gift" }, { emoji: "🏆", name: "trophy" }, { emoji: "🥇", name: "gold medal" },
    ],
  },
];

/* ── Component ─────────────────────────────────────────────────────────────── */

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("smileys");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const searchResults = useMemo<EmojiEntry[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: EmojiEntry[] = [];
    for (const cat of CATEGORIES) {
      for (const e of cat.emojis) {
        if (e.name.includes(q)) results.push(e);
        if (results.length >= 60) return results;
      }
    }
    return results;
  }, [query]);

  const currentCat = CATEGORIES.find((c) => c.id === activeCat) ?? CATEGORIES[0];
  const displayEmojis = query.trim() ? searchResults : currentCat.emojis;

  return (
    <div className="w-72 rounded-2xl bg-[#0f1621] border border-white/10 shadow-2xl flex flex-col overflow-hidden" style={{ height: 340 }}>
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06]">
        <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emojis…"
          className="flex-1 bg-transparent text-sm text-white placeholder-white/25 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="text-white/30 hover:text-white/60 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-white/25 hover:text-white/50 transition-colors ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category tabs — hidden when searching */}
      {!query.trim() && (
        <div className="flex gap-0.5 px-2 py-1.5 border-b border-white/[0.06] overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              title={cat.label}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                activeCat === cat.id
                  ? "bg-white/10"
                  : "hover:bg-white/5 opacity-60 hover:opacity-100"
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {displayEmojis.length === 0 ? (
          <p className="text-center text-white/25 text-xs pt-8">No emojis found</p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {displayEmojis.map((e, i) => (
              <button
                key={`${e.emoji}-${i}`}
                title={e.name}
                onClick={() => onSelect(e.emoji)}
                className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-white/10 transition-colors active:scale-90"
              >
                {e.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer label */}
      {!query.trim() && (
        <div className="px-3 py-1.5 border-t border-white/[0.06]">
          <p className="text-[10px] text-white/25 text-center">{currentCat.label}</p>
        </div>
      )}
    </div>
  );
}
