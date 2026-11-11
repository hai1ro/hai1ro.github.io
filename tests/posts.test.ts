// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { GitHubClient } from '../src/admin/github/client';
import { deleteDocument, saveDocument } from '../src/admin/data/posts';
import type { PostFrontmatter } from '../src/lib/frontmatter';

function frontmatter(draft: boolean): PostFrontmatter {
  return {
    title: 'Test',
    description: '',
    date: '2026-01-01',
    tags: [],
    draft,
    featured: false,
  };
}

function createClient() {
  const putFile = vi.fn(async () => ({
    content: { name: 'test.md', path: 'src/content/posts/test-post.md', sha: 'new-sha', size: 10 },
    commit: { sha: 'commit' },
  }));
  const deleteFile = vi.fn(async () => ({ commit: { sha: 'delete-commit' } }));
  const dispatchBlogPublish = vi.fn(async () => undefined);
  return {
    client: { putFile, deleteFile, dispatchBlogPublish } as unknown as GitHubClient,
    putFile,
    deleteFile,
    dispatchBlogPublish,
  };
}

describe('publish workflow', () => {
  it('does not dispatch when saving a new draft', async () => {
    const { client, dispatchBlogPublish } = createClient();
    const result = await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(true),
      body: 'draft',
      extra: {},
      isNew: true,
      wasPublished: false,
    });
    expect(dispatchBlogPublish).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(false);
  });

  it('does not dispatch when editing an existing draft', async () => {
    const { client, dispatchBlogPublish } = createClient();
    await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(true),
      body: 'draft',
      extra: {},
      sha: 'old-sha',
      isNew: false,
      wasPublished: false,
    });
    expect(dispatchBlogPublish).not.toHaveBeenCalled();
  });

  it('dispatches when publishing a new article', async () => {
    const { client, dispatchBlogPublish } = createClient();
    const result = await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(false),
      body: 'published',
      extra: {},
      isNew: true,
      wasPublished: false,
    });
    expect(dispatchBlogPublish).toHaveBeenCalledOnce();
    expect(result.dispatched).toBe(true);
  });

  it('dispatches when unpublishing a published article', async () => {
    const { client, dispatchBlogPublish } = createClient();
    await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(true),
      body: 'draft again',
      extra: {},
      sha: 'old-sha',
      isNew: false,
      wasPublished: true,
    });
    expect(dispatchBlogPublish).toHaveBeenCalledOnce();
  });

  it('surfaces dispatch errors without failing the save', async () => {
    const { client, dispatchBlogPublish } = createClient();
    dispatchBlogPublish.mockRejectedValueOnce(new Error('missing workflow scope'));
    const result = await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(false),
      body: 'published',
      extra: {},
      isNew: true,
      wasPublished: false,
    });
    expect(result.dispatched).toBe(false);
    expect(result.dispatchError).toContain('missing workflow scope');
  });

  it('does not dispatch when deleting a draft', async () => {
    const { client, dispatchBlogPublish } = createClient();
    await deleteDocument(client, {
      path: 'src/content/posts/test-post.md',
      sha: 'sha',
      title: 'Test',
      published: false,
    });
    expect(dispatchBlogPublish).not.toHaveBeenCalled();
  });

  it('dispatches when deleting a published article', async () => {
    const { client, dispatchBlogPublish } = createClient();
    await deleteDocument(client, {
      path: 'src/content/posts/test-post.md',
      sha: 'sha',
      title: 'Test',
      published: true,
    });
    expect(dispatchBlogPublish).toHaveBeenCalledOnce();
  });
});
