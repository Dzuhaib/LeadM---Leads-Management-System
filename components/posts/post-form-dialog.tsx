"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPost, updatePost } from "@/actions/social-posts";
import type { SocialPost } from "@/db/schema";

function looksLikeUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function PostFormDialog({
  post,
  trigger,
  variant = "default",
  size = "default",
}: {
  post?: Pick<SocialPost, "id" | "title" | "imageUrl" | "linkUrl">;
  trigger?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [imageUrl, setImageUrl] = React.useState(post?.imageUrl ?? "");
  const [previewFailed, setPreviewFailed] = React.useState(false);
  const isEdit = Boolean(post);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setImageUrl(post?.imageUrl ?? "");
      setPreviewFailed(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = String(value).trim();
    }

    startTransition(async () => {
      const result = isEdit
        ? await updatePost({ ...payload, id: post!.id })
        : await createPost(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Post updated." : "Post added.");
      setOpen(false);
      form.reset();
      router.refresh();
    });
  }

  const showPreview = looksLikeUrl(imageUrl) && !previewFailed;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={isEdit ? "Edit post" : "Add post"}
          >
            {isEdit ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {size === "icon" ? null : isEdit ? "Edit" : "Add post"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit post" : "Add a new post"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the title, image or link for this post."
              : "Share a post the team published. Everyone on the team will see it."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="What is this post about?"
              defaultValue={post?.title ?? ""}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL *</Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
                setPreviewFailed(false);
              }}
              required
            />
            <p className="text-xs text-muted-foreground">
              Paste a hosted image link. A preview appears below.
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Preview</span>
            <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
              {showPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="Post preview"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <p className="px-4 text-center text-xs text-muted-foreground">
                  {imageUrl.trim()
                    ? "Image preview is not available for this URL."
                    : "Enter an image URL to see the preview."}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkUrl">Post link *</Label>
            <Input
              id="linkUrl"
              name="linkUrl"
              type="url"
              placeholder="https://linkedin.com/posts/…"
              defaultValue={post?.linkUrl ?? ""}
              required
            />
            <p className="text-xs text-muted-foreground">
              Link to the published post on the platform.
            </p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
