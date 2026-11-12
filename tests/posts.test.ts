// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { GitHubClient } from '../src/admin/github/client';
import { deleteDocument, saveDocument } from '../src/admin/data/posts';
import type { PostFrontmatter } from '../src/lib/frontmatter';

function frontmatter(draft: boolean, type: PostFrontmatter['type'] = 'article', images: string[] = []): PostFrontmatter {
  return {
    type,
    title: 'Test',
    description: '',
    date: '2026-01-01',
    tags: [],
    images,
    draft,
    featured: false,
  };
}

function createClient() {
  const putFile = vi.fn(async () => ({
    content: {
      name: 'test.md',
      path: 'src/content/posts/test-post.md',
      sha: 'new-sha',
      size: 10,
    },
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

describe('saving and deleting', () => {
  it('saves a draft without triggering a build', async () => {
    const { client, putFile, dispatchBlogPublish } = createClient();
    await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(true),
      body: 'draft',
      extra: {},
      isNew: true,
    });
    expect(putFile).toHaveBeenCalledOnce();
    expect(dispatchBlogPublish).not.toHaveBeenCalled();
  });

  it('saves a published article without triggering a build', async () => {
    const { client, putFile, dispatchBlogPublish } = createClient();
    await saveDocument(client, {
      slug: 'test-post',
      frontmatter: frontmatter(false),
      body: 'published',
      extra: {},
      isNew: true,
    });
    expect(putFile).toHaveBeenCalledOnce();
    expect(dispatchBlogPublish).not.toHaveBeenCalled();
  });

  it('rejects an empty diary', async () => {
    const { client, putFile } = createClient();
    await expect(
      saveDocument(client, {
        slug: 'test-post',
        frontmatter: frontmatter(true, 'diary'),
        body: '   ',
        extra: {},
        isNew: true,
      }),
    ).rejects.toThrow('日记内容不能为空');
    expect(putFile).not.toHaveBeenCalled();
  });

  it('rejects a photo without images', async () => {
    const { client, putFile } = createClient();
    await expect(
      saveDocument(client, {
        slug: 'test-post',
        frontmatter: frontmatter(true, 'photo'),
        body: '',
        extra: {},
        isNew: true,
      }),
    ).rejects.toThrow('至少需要一张图片');
    expect(putFile).not.toHaveBeenCalled();
  });

  it('deletes an article without triggering a build', async () => {
    const { client, deleteFile, dispatchBlogPublish } = createClient();
    await deleteDocument(client, {
      path: 'src/content/posts/test-post.md',
      sha: 'sha',
      title: 'Test',
    });
    expect(deleteFile).toHaveBeenCalledOnce();
    expect(dispatchBlogPublish).not.toHaveBeenCalled();
  });
});
