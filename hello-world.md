# Hello World

这是你的第一篇文章。

## 工作流

```bash
# 任何地方，clone 仓库
git clone <your-repo-url>
cd my-docs

# 写文章（用任何编辑器）
echo "# 新文章" > new-post.md

# 推送，自动部署
git add .
git commit -m "new post"
git push
```

## 特性

- **VitePress** 构建，秒级热更新
- **GitHub Actions** 自动部署
- **全文搜索** 内置支持
- **代码高亮** 开箱即用

```ts
// 甚至支持代码高亮
const message: string = 'Hello VitePress!'
console.log(message)
```

## 下一步

在项目根目录新建 `.md` 文件，或者在子目录里组织文章，然后 push 即可自动更新站点。
