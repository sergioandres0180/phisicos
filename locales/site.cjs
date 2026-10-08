// Every page kind on the site, in sitemap order, and the topic each game belongs to.
const games=require('./games.cjs'),{topics}=require('./topics.cjs'),{tags}=require('./tags.cjs');
const gameKinds=['game',...games.map(g=>g.kind)],topicKinds=topics.map(t=>'topic-'+t.id),tagKinds=tags.map(t=>'tag-'+t.id);
for(const kind of gameKinds)if(topics.filter(t=>t.games.includes(kind)).length!==1)throw new Error(`Game ${kind} must belong to exactly one topic`);
// A collection lists existing games only, says how each one uses its idea, and never shadows a topic page.
for(const t of tags)for(const [lang,c] of Object.entries(t.copy)){
 for(const kind of t.games){if(!gameKinds.includes(kind))throw new Error(`Collection ${t.id} lists unknown game ${kind}`);if(!c.notes[kind])throw new Error(`Collection ${t.id} has no ${lang} note for ${kind}`);}
 if(topics.some(x=>x.copy[lang].slug===c.slug))throw new Error(`Collection ${t.id} slug ${c.slug} is a topic slug`);
}
module.exports={
 kinds:['home','topics',...topicKinds,...tagKinds,...gameKinds],
 gameKinds,
 // Collection pages list other pages; game pages hold one playable game.
 collections:new Set(['home','topics',...topicKinds,...tagKinds]),
 topics,
 tags,
 topicOf:kind=>kind.startsWith('topic-')?topics.find(t=>'topic-'+t.id===kind):topics.find(t=>t.games.includes(kind)),
 tagOf:kind=>tags.find(t=>'tag-'+t.id===kind),
 // Collections that list a game, shown as "Also in" links on its page.
 tagsOf:kind=>tags.filter(t=>t.games.includes(kind))
};
