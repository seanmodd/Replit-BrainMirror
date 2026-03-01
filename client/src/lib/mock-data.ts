export interface Note {
  id: string;
  title: string;
  content: string;
  author: string;
  authorHandle: string;
  date: string;
  url: string;
  tags: string[];
  folder: string;
  links: string[];
}

export const mockNotes: Note[] = [
  {
    id: "note-1",
    title: "System Design Principles",
    content: "Good system design is about managing trade-offs. You rarely find a perfect solution, only the one that fits your current constraints the best. Remember to document why you chose A over B. #architecture #engineering",
    author: "Alex Developer",
    authorHandle: "@alexdev",
    date: "2023-10-12",
    url: "https://twitter.com/alexdev/status/123",
    tags: ["architecture", "engineering", "system-design"],
    folder: "Engineering/Design",
    links: ["note-2", "note-4"]
  },
  {
    id: "note-2",
    title: "Trade-offs in Microservices",
    content: "Microservices aren't a free lunch. You're trading monolithic complexity for operational complexity. Only split when the organizational communication requires it. #microservices",
    author: "Sarah Architect",
    authorHandle: "@saraharch",
    date: "2023-11-05",
    url: "https://twitter.com/saraharch/status/124",
    tags: ["microservices", "architecture", "tradeoffs"],
    folder: "Engineering/Architecture",
    links: ["note-1", "note-5"]
  },
  {
    id: "note-3",
    title: "Learning React in 2024",
    content: "The best way to learn React isn't by watching 100 hours of tutorials. Build a small app, break it, figure out why it broke, and rebuild it better. #reactjs #webdev",
    author: "Frontend Joe",
    authorHandle: "@frontendjoe",
    date: "2024-01-15",
    url: "https://twitter.com/frontendjoe/status/125",
    tags: ["reactjs", "webdev", "learning"],
    folder: "Web/Frontend",
    links: ["note-6"]
  },
  {
    id: "note-4",
    title: "Documenting Decisions",
    content: "Architecture Decision Records (ADRs) are the most underutilized tool in software engineering. Write down the 'why' before you forget. #documentation",
    author: "Alex Developer",
    authorHandle: "@alexdev",
    date: "2023-10-14",
    url: "https://twitter.com/alexdev/status/126",
    tags: ["documentation", "engineering", "adrs"],
    folder: "Engineering/Process",
    links: ["note-1"]
  },
  {
    id: "note-5",
    title: "Conway's Law",
    content: "Organizations design systems that mirror their own communication structures. Conway's Law is undefeated. #management #architecture",
    author: "Lead Tech",
    authorHandle: "@leadtech",
    date: "2023-12-01",
    url: "https://twitter.com/leadtech/status/127",
    tags: ["management", "architecture", "conways-law"],
    folder: "Management",
    links: ["note-2", "note-8"]
  },
  {
    id: "note-6",
    title: "State Management in React",
    content: "Keep state as local as possible. Don't reach for global state management until prop drilling becomes genuinely painful. #reactjs",
    author: "Frontend Joe",
    authorHandle: "@frontendjoe",
    date: "2024-02-10",
    url: "https://twitter.com/frontendjoe/status/128",
    tags: ["reactjs", "state-management"],
    folder: "Web/Frontend",
    links: ["note-3"]
  },
  {
    id: "note-7",
    title: "The Art of Refactoring",
    content: "Refactoring isn't a separate phase of development. It's something you do continuously as you add features. Leave the camp cleaner than you found it.",
    author: "Clean Coder",
    authorHandle: "@cleancoder",
    date: "2024-03-01",
    url: "https://twitter.com/cleancoder/status/129",
    tags: ["refactoring", "clean-code", "engineering"],
    folder: "Engineering/BestPractices",
    links: ["note-1", "note-3"]
  },
  {
    id: "note-8",
    title: "Team Topologies",
    content: "If you want a specific software architecture, you must first design your team structure to support it. #teamtopologies",
    author: "Lead Tech",
    authorHandle: "@leadtech",
    date: "2023-12-15",
    url: "https://twitter.com/leadtech/status/130",
    tags: ["management", "teams"],
    folder: "Management",
    links: ["note-5"]
  }
];

// Helper to generate graph data from notes
export function generateGraphData(notes: Note[]) {
  const nodes = notes.map(note => ({
    id: note.id,
    name: note.title,
    val: note.links.length + 1, // Size based on connections
    group: note.folder.split('/')[0] // Color grouping by top-level folder
  }));

  const links: {source: string, target: string}[] = [];
  
  notes.forEach(note => {
    note.links.forEach(targetId => {
      // Only add link if target exists and we haven't already added this link (in either direction)
      if (
        notes.some(n => n.id === targetId) && 
        !links.some(l => (l.source === note.id && l.target === targetId) || (l.source === targetId && l.target === note.id))
      ) {
        links.push({
          source: note.id,
          target: targetId
        });
      }
    });
  });

  return { nodes, links };
}
