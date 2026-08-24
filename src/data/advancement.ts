export interface SpecialImprovementOption {
  name: string;
  summary: string;
}

export const fellowshipSpecialImprovements: SpecialImprovementOption[] = [
  { name: 'Campfire Stories', summary: 'During camp or sojourn, one Hero may share a story between the first and second activities; each member may remove one tier of a harmful status, at the Narrator’s discretion.' },
  { name: 'One of Us', summary: 'Choose an accompanying NPC. Everyone may write an additional Fellowship relationship tag with that character.' },
  { name: 'Sacrifice', summary: 'When two or more Heroes suffer the same Consequences, a Hero who can reasonably defend another may spend reaction Power to lessen the ally’s Consequences.' },
  { name: 'Teamwork', summary: 'When two or more Heroes take the same action while camping or sojourning, they each get +1 Power.' },
  { name: 'United by the Cause', summary: 'Once per session, when the whole Fellowship cooperates in a scene aligned with the Quest, each member may recover a Fellowship theme tag.' },
];

export const specialImprovementsByThemebook: Record<string, SpecialImprovementOption[]> = {
  circumstance: [
    { name: 'Comfort Zone', summary: 'Camp or sojourn in your Circumstance and recover one additional scratched power tag.' },
    { name: 'Expected Role', summary: 'Once per session, gain an appropriate expected-role status at tier 2 before a fitting social action.' },
    { name: 'Familiar Matters', summary: 'Once per scene, ask the Narrator for an important detail related to your Circumstance.' },
    { name: 'Strength From Adversity', summary: 'Once per session when this theme’s weakness is invoked, gain driven-2 for that roll.' },
    { name: 'Trudging Along', summary: 'Choose a familiar status type; once per scene ignore it when it is tier 3 or lower.' },
  ],
  devotion: [
    { name: 'Bodyguard', summary: 'When your Devotion takes Consequences, you may take them instead when possible.' },
    { name: 'Catch Me When I Fall', summary: 'Once per session, acting beside your Devotion can turn Consequences-only into Success with Consequences.' },
    { name: 'Deeply Committed', summary: 'Once per scene when pursuing this Quest, gain committed-2 for the action.' },
    { name: 'Goes Both Ways', summary: 'Once per session, gain a story tag representing aid from the object of your Devotion.' },
    { name: 'Unwavering', summary: 'Once per session, prevent a tag in this theme from being scratched.' },
  ],
  past: [
    { name: 'Face From The Past', summary: 'Once per session, define a first meeting with someone from your Past and give them an appropriate tier-2 status.' },
    { name: 'Lessons Learned', summary: 'Once per session after a 6 or less, explain how your Past prepared you and reroll.' },
    { name: 'Not Letting Go', summary: 'When burning a tag from this theme, you may mark Abandon on another theme instead of scratching it.' },
    { name: 'Put It Behind Me', summary: 'At Scarring sacrifice level, take a 7–9 instead of rolling and replace this theme.' },
    { name: 'Vivid Memory', summary: 'Once per session when this weakness is invoked, reveal or discover a Past detail and gain a fitting story tag or tier-2 emotional status.' },
  ],
  people: [
    { name: 'Shared Language', summary: 'Once per scene, social interaction with your People that gets 7–9 may ignore the Consequences.' },
    { name: 'Stand Out', summary: 'Once per scene, acting against your People’s habits on a 7–9 may ignore the Consequences.' },
    { name: 'True To My Tribe', summary: 'Once per scene, willingly accept risk to follow your People’s ways and mark Improve.' },
    { name: 'Trust in Legacy', summary: 'Choose a People power tag; once per session, Consequences-only with it can also Succeed.' },
    { name: 'Wisdom Handed Down', summary: 'Once per scene, ask for an important detail from your People’s body of knowledge.' },
  ],
  personality: [
    { name: 'Adaptable Persona', summary: 'Once per session, Consequences-only on an action using this theme can also Succeed.' },
    { name: 'Big Personality', summary: 'Burned power tags from this theme add 4 Power instead of 3.' },
    { name: 'Infectious Personality', summary: 'During camp or sojourn, give another Hero a story tag reflecting your Personality.' },
    { name: 'Lasting Impression', summary: 'Once per scene after a successful social action, give everyone affected a lasting impression.' },
    { name: 'Unshakeable', summary: 'Once per scene on a 7+ social or emotional reaction, spend all Power to avoid all Consequence Effects.' },
  ],
  'skill-trade': [
    { name: 'Deft Remedy', summary: 'Once per session after a 6 or less using this theme, reroll and keep the new result.' },
    { name: 'Learn from My Mistakes', summary: 'Once per scene when an action using this theme does not Succeed, mark Improve.' },
    { name: 'Practice Makes Perfect', summary: 'Choose a fitting helpful status; burn a tag from this theme to gain it at tier 3.' },
    { name: 'Rehearsed Technique', summary: 'Choose a power tag; when burned, you may treat the dice total as 7 before adding Power.' },
    { name: 'Resourceful', summary: 'When preparing or crafting during camp or sojourn, create one extra story tag.' },
  ],
  trait: [
    { name: 'Innate Sense', summary: 'Once per session, ask for an important detail you can intuit through your Trait.' },
    { name: 'Made for This', summary: 'Choose a hindering status your Trait overcomes; once per scene ignore it when acting.' },
    { name: 'Moment to Shine', summary: 'Once per session when using this theme, reduce the severity of being Imperiled by one step.' },
    { name: 'Pull Through', summary: 'Once per session when rolling with this theme, ignore a negative physical or emotional status of tier 3 or lower.' },
    { name: 'Wild Blood', summary: 'Gain a Special Improvement from the Uncanny Being themebook.' },
  ],
  duty: [
    { name: 'Dutiful Anticipation', summary: 'Once per scene, ask for the closest or next danger standing between you and this Quest.' },
    { name: 'Grim Determination', summary: 'Once per session when advancing this Quest and suffering Consequences, gain determined-2 before reacting.' },
    { name: 'Painful Lessons', summary: 'Once per session when using this theme and suffering Consequences, mark Improve.' },
    { name: 'Driven by Shame', summary: 'Once per scene, add Power equal to the current Abandon marks on this theme.' },
    { name: 'Unstoppable', summary: 'Once per scene while pursuing this Quest, a 7–9 using this theme may ignore the Consequences.' },
  ],
  influence: [
    { name: 'Follow Me!', summary: 'Once per session after a successful rally or recruit action, create multiple single-use story tags for 1 Power each.' },
    { name: 'Friends Everywhere', summary: 'The first time you enter a settlement, gain a useful local contact.' },
    { name: 'Long Reach', summary: 'Once per session, place a plausible representative anywhere and act through them using this theme.' },
    { name: 'Overextend', summary: 'When a roll with this theme causes a status Consequence, raise it one tier to gain 2 Power to spend.' },
    { name: 'Read Between the Lines', summary: 'A reaction using this theme against social or influence Consequences also reveals an important detail about their source.' },
  ],
  knowledge: [
    { name: 'A Known Expert', summary: 'Once per session, gain an audience with an interested NPC or remove up to 3 tiers of hostility or resistance.' },
    { name: 'Always Thinking', summary: 'During camp or sojourn, a third-period action using only this theme does not automatically cause Consequences.' },
    { name: 'Applied Expertise', summary: 'Once per session after spending Power to discover with this theme, gain a free practical story tag.' },
    { name: 'Inventive Stroke', summary: 'When the title tag is used in a genuinely new practical application, it gives 2 Power instead of 1.' },
    { name: 'Flashes of Insight', summary: 'The first time you encounter something this Knowledge applies to, ask for one valuable detail.' },
  ],
  'prodigious-ability': [
    { name: 'Improved Counter', summary: 'On a 10+ reaction using this theme, keep the spotlight to counterattack and reuse tags from the spotlight.' },
    { name: 'Create An Opening', summary: 'Once per session after Succeeding with this theme, create a free tier-2 opportunity status for an ally.' },
    { name: 'Discerning Eye', summary: 'Once per session after observing someone’s work or action, learn three valuable details through your Ability.' },
    { name: 'Masterpiece', summary: 'With enough time and resources, create a grand work as a story theme and mark a Milestone.' },
    { name: 'Practiced Maneuver', summary: 'Once per session, a familiar maneuver using this theme that gets Consequences-only may also Succeed.' },
  ],
  relic: [
    { name: 'Eternal Bond', summary: 'Scratch a tag to retrieve the Relic from anywhere; or mark Abandon to clear its statuses or reform it.' },
    { name: 'Momentary Bearer', summary: 'Once per session, another player may use this theme’s power tags while they can access the Relic.' },
    { name: 'Reckless Discharge', summary: 'Once per session, treat this theme as one Might level higher for an action and mark Abandon.' },
    { name: 'Sentinel', summary: 'Choose a protective tier-2 status; once per session gain it when in imminent danger.' },
    { name: 'Signature Move', summary: 'Choose a power tag and tier-2 status; once per session after Succeeding with that tag, give the status for free.' },
  ],
  'uncanny-being': [
    { name: 'Expressive Form', summary: 'Choose a status describing your form; once per session gain it at tier 2.' },
    { name: 'Repel Witchery', summary: 'Once per scene, a 6 or less reaction against magical Consequences may still spend Power to lessen Effects.' },
    { name: 'Self Discovery', summary: 'Once per session when discovering something new about your origin or abilities, mark Improve.' },
    { name: 'Shifting Form', summary: 'Once per session, replace a non-title power tag in this theme to reflect a change in your form.' },
    { name: 'Strive to Belong', summary: 'Once per session after observing another Hero’s mundane action, gain a story tag representing imitation or understanding.' },
  ],
  destiny: [
    { name: 'As Foretold', summary: 'Once per session, declare a pivotal action; count Power but replace the roll with Success and Consequences.' },
    { name: 'Meet It Head-On', summary: 'Once per session when confronting an obstacle to Destiny, gain a readiness story tag or tier-2 status first.' },
    { name: 'Not How It Ends', summary: 'Once per session, completely avoid Consequences that would hinder progress toward Destiny.' },
    { name: 'Reincarnation', summary: 'When Destiny manifests, remove any harmful status, evolve this theme, and optionally replace other themes with Promise as normal.' },
    { name: 'Pull of Destiny', summary: 'Once per session, ask the Narrator for the best way to pursue your Destiny and receive a valuable detail.' },
  ],
  dominion: [
    { name: 'Embodiment of the Realm', summary: 'Statuses on you and your Dominion apply to one another.' },
    { name: 'Good Help Is Hard to Find', summary: 'Name an important assistant; once per session gain a story tag they produce for you.' },
    { name: 'My Word Is Absolute', summary: 'Once per session create a decree story tag that holds throughout the Dominion until scratched or replaced.' },
    { name: 'Regalia', summary: 'Choose a symbol of office; once per scene in its presence gain majestic-2.' },
    { name: 'Untarnished Glory', summary: 'Once per session remove 2 tiers of a negative Dominion status or recover a scratched tag in this theme.' },
  ],
  mastery: [
    { name: 'Always Prepared', summary: 'Once per scene, a broad tag from this theme can count as directly relevant without a prep action.' },
    { name: 'Calculated Sacrifice', summary: 'Before a Grave sacrifice tied to Mastery, replace another dear theme to upgrade a 7–9 to 10+ if you Succeed.' },
    { name: 'Foresee the Outcome', summary: 'Once per session, erase an action with total 9 or less as a prediction and take a different action.' },
    { name: 'Lifelong Insight', summary: 'When replacing this theme, keep one other Special Improvement from it and add it to the new theme.' },
    { name: 'Second Wind', summary: 'Once per session, recover two scratched tags here by scratching one tag on another theme.' },
  ],
  monstrosity: [
    { name: 'Display of Force', summary: 'Once per session after Success without Consequences, give onlookers a tier-3 status of awe, respect, or fear.' },
    { name: 'Fine Control', summary: 'Gain a Special Improvement from the Mastery themebook.' },
    { name: 'Invulnerability', summary: 'Choose a protective power tag; ignore Consequences it applies to while it remains unscratched.' },
    { name: 'Magical Trace', summary: 'At scene end leave a magical trace; scratch it later to act using this theme as though at that location.' },
    { name: 'Surge of Power', summary: 'Once per session, a burned tag from this theme gives 5 Power; afterward take exhausted-2 that cannot be lessened.' },
  ],
  companion: [
    { name: 'Everyone’s Best Friend', summary: 'Once per session when your Companion helps another Hero, use only this theme and get Success without Consequences without rolling.' },
    { name: 'Here For You', summary: 'Once per session when you and your Companion heal or help each other recover outside camping, mark Improve.' },
    { name: 'Perfect Positioning', summary: 'Once per session, place the Companion anywhere plausible in the scene and give them a tier-2 advantageous-position status.' },
    { name: 'Reliable Ally', summary: 'Once per session when acting together and getting Consequences-only, scratch a tag here to also Succeed.' },
    { name: 'Retaliation', summary: 'When someone harms or hinders the Companion with a tag or status, gain provoked-2 for retaliation.' },
  ],
  magic: [
    { name: 'Scholar of Magic', summary: 'Once per scene when witnessing similar magic, ask for one valuable detail about it.' },
    { name: 'Ward Breaker', summary: 'Once per session after Succeeding against a ward, also scratch a defensive tag or reduce a defensive status by 2 tiers.' },
    { name: 'Rote Technique', summary: 'Once per session, a familiar use of your Magic that gets Consequences-only may also Succeed.' },
    { name: 'Reputation Precedes', summary: 'Choose a tier-2 reaction status; when meeting a character for the first time you may give it to them.' },
    { name: 'Inspired Ingenuity', summary: 'Once per session when using Magic in a genuinely new way, mark Improve.' },
  ],
  possessions: [
    { name: 'Durable', summary: 'Choose a tag here; once per session prevent Consequences from scratching it or giving it a tier-3-or-less status.' },
    { name: 'Favorite Piece', summary: 'Choose a power tag here; once per session burn it for Power without scratching it.' },
    { name: 'I’m Keeping This', summary: 'Move a backpack tag into this theme as a power tag; once per session swap it for a different backpack tag.' },
    { name: 'Just The Thing', summary: 'Once per session gain a story tag for something useful you have or access, or a newly revealed use of your items.' },
    { name: 'Quartermaster', summary: 'Choose an item power tag; Fellowship members may treat it as if it were in their backpack when you can hand it over.' },
  ],
};

export interface QuintessenceOption {
  name: string;
  summary: string;
  themeBinding?: 'origin-or-adventure' | 'adventure-or-greatness';
}

export const quintessences: QuintessenceOption[] = [
  { name: 'Beyond Luck', summary: 'Double ones no longer automatically miss.' },
  { name: 'Canny One', summary: 'Once per session, turn incoming Consequences or a Challenge ability into a Threat and immediately act to address it.' },
  { name: 'Dark Horse', summary: 'When you die, narrate the death and, with approval, cause one immense tier-6 change that cannot be lessened.' },
  { name: 'Diligent Drudge', summary: 'Improve tracks become 5 boxes; the fifth mark grants two improvements and resets the track.' },
  { name: 'Fumbling Master', summary: 'When a weakness is invoked in a roll, you may lose 2 Power and mark 2 Improve instead of 1.' },
  { name: 'Jack of Many Lives', summary: 'Once per scene, gain as a story tag a non-item power tag from a theme you previously evolved or replaced.' },
  { name: 'Larger Than Life', summary: 'Being Imperiled by lower Might costs only 2 Power and increases status Consequences by only 2 tiers.' },
  { name: 'Loyal Companion', summary: 'Once per scene while directly helping another Hero, reduce the severity of being Imperiled by one step.' },
  { name: 'Lucky Bastard', summary: 'Once per session, turn a 6 or less into a 7 unless the dice were double ones.' },
  { name: 'Magus Magnificent', summary: 'Store Power from magic preparation in your backpack and spend it later to create related magic-ability tags.' },
  { name: 'Master of Craft', summary: 'When crafting during camp or sojourn, reduce the severity of being Imperiled by the task by one step.' },
  { name: 'Master of the Little Things', summary: 'Bind to an Adventure or Greatness theme; when its Might works against you, treat it one level lower.', themeBinding: 'adventure-or-greatness' },
  { name: 'Nine Lives', summary: 'Three times, a status above your Limit can be reduced back to the Limit at the next scene; then this Quintessence is removed.' },
  { name: 'Old Hand', summary: 'Immediately choose seven Special Improvements across your themes.' },
  { name: 'Pillar of Wisdom', summary: 'Once per scene, valuable guidance lets another Hero reduce the severity of being Imperiled by one step.' },
  { name: 'The Bearer', summary: 'Store Power from packing in your backpack and spend it later to create related item tags.' },
  { name: 'The Common Hero', summary: 'Bind to an Origin or Adventure theme; when using its tags, treat its Might one level higher.', themeBinding: 'origin-or-adventure' },
  { name: 'Virtuoso', summary: 'Once per session, treat a 7–9 roll as a 10.' },
];

export const fulfillmentOptions = [
  'Arrive at Journey’s End',
  'Be Reforged',
  'Gain a Quintessence',
  'Shake the Foundations of Magic',
  'Speak Words Eternal',
  'Unearth Lost Truths',
] as const;
