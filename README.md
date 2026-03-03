# BrainMirror (SecondBrain) 🧠🪞

BrainMirror is a powerful web-based "second brain" system designed to transform your chaotic Twitter/X bookmarks and likes into a structured, searchable, and navigable knowledge base. It bridges the gap between social media consumption and long-term knowledge retention.

![BrainMirror Home Page](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200)

## 🚀 The Purpose

In the age of information overload, we often bookmark tweets that contain valuable insights, threads, or resources, only to never look at them again. BrainMirror solves this by:

1.  **Centralizing Knowledge**: Automatically syncs your bookmarks and likes from X into a private, local database.
2.  **Structuring Data**: Categorizes content by authors, tags, and threads.
3.  **Enhancing Discovery**: Provides a force-directed graph visualization to see connections between different concepts and authors.
4.  **Obsidian Integration**: Exports your structured notes directly to GitHub or as Markdown files, perfectly formatted for Obsidian with wiki-links and metadata.

## 🛠 Key Features

-   **Multi-Source Sync**: Import bookmarks via OAuth 2.0 or public tweets/likes via Bearer Token.
-   **Thread Reconstruction**: Automatically detects and groups tweets that belong to the same conversation.
-   **Advanced Filtering**: Search by content, filter by author, or explore via hashtags.
-   **Graph View**: Visualize your intellectual network and see which topics are most interconnected.
-   **Media Proxying**: Handles Twitter media and profile images reliably to ensure your library always looks great.
-   **Automated Tagging**: Intelligent tagging based on tweet source and content.

## 🏗 Technology Stack

-   **Frontend**: React + Vite with Tailwind CSS (v4) and shadcn/ui.
-   **Backend**: Express.js API server.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Integrations**: X API v2, GitHub API (via Replit Connector).

## 📖 How it Works

1.  **Connect**: Link your X account and optionally your GitHub repository.
2.  **Sync**: Run a sync operation to pull in your latest bookmarks and likes.
3.  **Curate**: Use the library view to review, tag, and organize your saved tweets.
-   **Visualize/Export**: Explore your knowledge graph or push your notes to your Obsidian vault via GitHub.
