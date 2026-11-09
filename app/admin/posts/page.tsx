import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PostFormDialog } from "@/components/posts/post-form-dialog";
import { PostsGrid } from "@/components/posts/posts-grid";
import { requireAdmin } from "@/lib/auth";
import {
  listSocialPostAuthors,
  listSocialPosts,
} from "@/lib/social-posts";
import { getSettings } from "@/lib/settings";
import { socialPostListParamsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: SearchParams, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const text = single(value);
    if (text && key !== "page") search.set(key, text);
  }
  search.set("page", String(page));
  return `/admin/posts?${search.toString()}`;
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const settingsRow = await getSettings();

  const parsed = socialPostListParamsSchema.safeParse({
    page: single(params.page) ?? 1,
    pageSize: single(params.pageSize) ?? 12,
    q: single(params.q),
    author: single(params.author) || undefined,
    sort: single(params.sort) ?? "created_at",
    dir: single(params.dir) ?? "desc",
  });

  const query = parsed.success
    ? parsed.data
    : socialPostListParamsSchema.parse({});

  const [result, authors] = await Promise.all([
    listSocialPosts(query),
    listSocialPostAuthors(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team posts"
        description="Every social post across the team, with the author and a link to the published post."
        actions={<PostFormDialog />}
      />

      <form
        method="get"
        className="grid gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-2 xl:grid-cols-6"
      >
        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Search title or author…"
          aria-label="Search posts"
          className="xl:col-span-2"
        />
        <Select
          name="author"
          defaultValue={query.author ?? ""}
          aria-label="Filter by author"
        >
          <option value="">All authors</option>
          {authors.map((author) => (
            <option key={author.id} value={author.id}>
              {author.fullName || author.email}
            </option>
          ))}
        </Select>
        <Select
          name="sort"
          defaultValue={query.sort}
          aria-label="Sort posts by"
        >
          <option value="created_at">Sort: date added</option>
          <option value="title">Sort: title</option>
        </Select>
        <Select
          name="dir"
          defaultValue={query.dir}
          aria-label="Sort direction"
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </Select>
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm">
            Filter
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/posts">Clear</Link>
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {result.total} post{result.total === 1 ? "" : "s"} found
        </p>
        <p>
          Page {result.page} of {result.totalPages}
        </p>
      </div>

      <PostsGrid
        posts={result.rows}
        currentUserId=""
        isAdmin
        timeZone={settingsRow.timezone}
      />

      <div className="flex items-center justify-between">
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-disabled={result.page <= 1}
          className={result.page <= 1 ? "pointer-events-none opacity-50" : ""}
        >
          <Link href={buildHref(params, Math.max(1, result.page - 1))}>
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-disabled={result.page >= result.totalPages}
          className={
            result.page >= result.totalPages
              ? "pointer-events-none opacity-50"
              : ""
          }
        >
          <Link
            href={buildHref(
              params,
              Math.min(result.totalPages, result.page + 1),
            )}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
