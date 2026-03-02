import { useEffect, useRef, useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";

interface TweetEmbedProps {
  tweetUrl: string;
  tweetId: string;
}

export default function TweetEmbed({ tweetUrl, tweetId }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!tweetUrl || !containerRef.current) return;

    setLoading(true);
    setError(false);

    const container = containerRef.current;
    container.innerHTML = "";

    const idMatch = tweetUrl.match(/status\/(\d+)/);
    const statusId = idMatch?.[1] || tweetId;
    if (!statusId || !/^\d+$/.test(statusId)) {
      setError(true);
      setLoading(false);
      return;
    }

    const loadWidget = () => {
      const win = window as any;
      if (win.twttr && win.twttr.widgets) {
        win.twttr.widgets.createTweet(statusId, container, {
          theme: "dark",
          conversation: "none",
          dnt: true,
          align: "center",
          width: 500,
        }).then((el: any) => {
          setLoading(false);
          if (!el) setError(true);
        }).catch(() => {
          setLoading(false);
          setError(true);
        });
      }
    };

    const win = window as any;
    if (win.twttr && win.twttr.widgets) {
      loadWidget();
    } else {
      if (!document.getElementById("twitter-widget-js")) {
        const script = document.createElement("script");
        script.id = "twitter-widget-js";
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.onload = () => setTimeout(loadWidget, 300);
        script.onerror = () => { setLoading(false); setError(true); };
        document.head.appendChild(script);
      } else {
        const check = setInterval(() => {
          if (win.twttr && win.twttr.widgets) {
            clearInterval(check);
            loadWidget();
          }
        }, 200);
        setTimeout(() => { clearInterval(check); setLoading(false); setError(true); }, 10000);
      }
    }

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [tweetUrl]);

  return (
    <div data-testid={`tweet-embed-${tweetId}`}>
      {loading && (
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading tweet...</span>
        </div>
      )}
      <div ref={containerRef} className="[&>div]:!max-w-full [&_.twitter-tweet]:!my-0" />
      {error && !loading && (
        <div className="flex items-center justify-center py-4 gap-2">
          <span className="text-xs text-muted-foreground">Could not load embed</span>
          <a href={tweetUrl} target="_blank" rel="noreferrer" className="text-xs text-[#1d9bf0] hover:underline flex items-center gap-1">
            <ExternalLink size={12} /> View on X
          </a>
        </div>
      )}
    </div>
  );
}
