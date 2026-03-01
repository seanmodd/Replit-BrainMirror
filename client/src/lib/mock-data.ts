export interface TweetNote {
  id: string;
  tweet_id: string;
  conversation_id: string;
  tweet_url: string;
  author_handle: string;
  author_name: string;
  created_at: string;
  content: string;
  tags: string[];
  thread_position?: string;
  quoted_tweet_id?: string;
  in_reply_to_tweet_id?: string;
  links: string[]; // Internal wiki links or connected tweet IDs
}

export const mockTweets: TweetNote[] = [
  {
    id: "note-1",
    tweet_id: "12345678901",
    conversation_id: "conv-1",
    tweet_url: "https://x.com/alexdev/status/12345678901",
    author_handle: "@alexdev",
    author_name: "Alex Developer",
    created_at: "2023-10-12T14:20:00Z",
    content: "Good system design is about managing trade-offs. You rarely find a perfect solution, only the one that fits your current constraints the best. Remember to document why you chose A over B. #architecture #engineering",
    tags: ["twitter-bookmark", "#architecture", "#engineering", "author-@alexdev"],
    thread_position: "1/2",
    links: ["note-2"]
  },
  {
    id: "note-2",
    tweet_id: "12345678902",
    conversation_id: "conv-1",
    tweet_url: "https://x.com/alexdev/status/12345678902",
    author_handle: "@alexdev",
    author_name: "Alex Developer",
    created_at: "2023-10-12T14:21:00Z",
    content: "Architecture Decision Records (ADRs) are the most underutilized tool in software engineering. Write down the 'why' before you forget. #documentation",
    tags: ["twitter-bookmark", "#documentation", "#engineering", "author-@alexdev"],
    thread_position: "2/2",
    in_reply_to_tweet_id: "12345678901",
    links: ["note-1"]
  },
  {
    id: "note-3",
    tweet_id: "98765432101",
    conversation_id: "conv-2",
    tweet_url: "https://x.com/saraharch/status/98765432101",
    author_handle: "@saraharch",
    author_name: "Sarah Architect",
    created_at: "2023-11-05T09:15:00Z",
    content: "Microservices aren't a free lunch. You're trading monolithic complexity for operational complexity. Only split when the organizational communication requires it. #microservices",
    tags: ["twitter-bookmark", "#microservices", "#architecture", "author-@saraharch"],
    links: ["note-1"] // related concepts
  },
  {
    id: "note-4",
    tweet_id: "55555555555",
    conversation_id: "conv-3",
    tweet_url: "https://x.com/frontendjoe/status/55555555555",
    author_handle: "@frontendjoe",
    author_name: "Frontend Joe",
    created_at: "2024-01-15T18:45:00Z",
    content: "The best way to learn React isn't by watching 100 hours of tutorials. Build a small app, break it, figure out why it broke, and rebuild it better. #reactjs #webdev",
    tags: ["twitter-bookmark", "#reactjs", "#webdev", "author-@frontendjoe"],
    links: []
  },
  {
    id: "note-5",
    tweet_id: "77777777777",
    conversation_id: "conv-4",
    tweet_url: "https://x.com/leadtech/status/77777777777",
    author_handle: "@leadtech",
    author_name: "Lead Tech",
    created_at: "2023-12-01T11:30:00Z",
    content: "Organizations design systems that mirror their own communication structures. Conway's Law is undefeated. #management",
    tags: ["twitter-bookmark", "#management", "#architecture", "author-@leadtech"],
    links: ["note-3"]
  }
];

export const mockAuthorHubs = [
  { id: "hub-1", title: "Twitter - @alexdev.md", links: ["note-1", "note-2"] },
  { id: "hub-2", title: "Twitter - @saraharch.md", links: ["note-3"] },
  { id: "hub-3", title: "Twitter - @frontendjoe.md", links: ["note-4"] },
  { id: "hub-4", title: "Twitter - @leadtech.md", links: ["note-5"] }
];

export function generateGraphData(tweets: TweetNote[], hubs: {id: string, title: string, links: string[]}[]) {
  const nodes: any[] = [];
  const links: any[] = [];

  // Add Tweet nodes
  tweets.forEach(tweet => {
    nodes.push({
      id: tweet.id,
      name: `${tweet.author_handle} - ${tweet.content.substring(0, 20)}...`,
      val: tweet.links.length + 2,
      group: 'Tweet',
      color: '#A78BFA' // lavender
    });

    tweet.links.forEach(targetId => {
      if (tweets.some(t => t.id === targetId) && 
          !links.some(l => (l.source === tweet.id && l.target === targetId) || (l.source === targetId && l.target === tweet.id))) {
        links.push({ source: tweet.id, target: targetId });
      }
    });
  });

  // Add Author Hub nodes
  hubs.forEach(hub => {
    nodes.push({
      id: hub.id,
      name: hub.title,
      val: hub.links.length * 2 + 5,
      group: 'Author',
      color: '#7C3AED' // primary purple
    });

    hub.links.forEach(targetId => {
      links.push({ source: hub.id, target: targetId });
    });
  });

  return { nodes, links };
}
