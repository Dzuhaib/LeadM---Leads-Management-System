import { ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { DeletePostButton } from "@/components/posts/delete-post-button";
import { PostFormDialog } from "@/components/posts/post-form-dialog";
import { formatRelative } from "@/lib/date";
import type { SocialPostRow } from "@/lib/social-posts";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PostsGrid({
  posts,
  currentUserId,
  isAdmin,
  timeZone,
}: {
  posts: SocialPostRow[];
  currentUserId: string;
  isAdmin: boolean;
  timeZone: string;
}) {
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No posts yet"
        description="Add the first post with an image, a title and the link where it was published."
        action={<PostFormDialog />}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => {
        const authorLabel = post.authorName || post.authorEmail;
        const canManage = isAdmin || post.authorId === currentUserId;

        return (
          <Card
            key={post.id}
            className="flex flex-col overflow-hidden transition-shadow hover:shadow-md"
          >
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="block aspect-video overflow-hidden bg-secondary/50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </a>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-1">
                <h3 className="line-clamp-2 font-semibold text-foreground">
                  {post.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatRelative(post.createdAt, timeZone)}
                </p>
              </div>
              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(authorLabel)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {authorLabel}
                  </span>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button asChild variant="ghost" size="icon">
                    <a
                      href={post.linkUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label="Open post"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  {canManage ? (
                    <>
                      <PostFormDialog post={post} variant="ghost" size="icon" />
                      <DeletePostButton postId={post.id} title={post.title} />
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
