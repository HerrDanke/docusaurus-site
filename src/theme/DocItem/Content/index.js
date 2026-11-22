import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import Heading from '@theme/Heading';
import MDXContent from '@theme/MDXContent';
/**
 Title can be declared inside md content or declared through
 front matter and added manually. To make both cases consistent,
 the added title is added under the same div.markdown block
 See https://github.com/facebook/docusaurus/pull/4882#issuecomment-853021120

 We render a "synthetic title" if:
 - user doesn't ask to hide it with front matter
 - the markdown content does not already contain a top-level h1 heading
*/
function useSyntheticTitle() {
  const {metadata, frontMatter, contentTitle} = useDoc();
  const shouldRender =
    !frontMatter.hide_title && typeof contentTitle === 'undefined';
  if (!shouldRender) {
    return null;
  }
  return metadata.title;
}
export default function DocItemContent({children}) {
  const syntheticTitle = useSyntheticTitle();
  // 本仓库改动：给清单类页面（starred 实例）的正文容器加 `doc-wide-page`。
  // 样式在 src/css/custom.css：把原始 <table> 从 Docusaurus 默认的
  // `display:block + overflow:auto` 还原成真正的表格——列宽铺满、链接列不折行，
  // 「下载 · 官网」因此保持在同一行；窄屏时表格自身横向滚动。
  // 放在 Content 层（而不是 Layout 层）是因为这里就是渲染 .theme-doc-markdown
  // 的组件，class 直接写在 JSX 上，SSR 与客户端输出天然一致，不依赖 DOM 副作用。
  // 注意：metadata 里没有 pluginId 字段（实测 Docusaurus 3.10 的 DocMetadata 不含它），
  // 只能按路径判断。清单页都在 starred 实例下：/starred/*。
  const {metadata} = useDoc();
  const wide =
    metadata?.pluginId === 'starred' ||
    String(metadata?.permalink || '').startsWith('/starred/');
  return (
    <div
      className={clsx(
        ThemeClassNames.docs.docMarkdown,
        'markdown',
        wide && 'doc-wide-page',
      )}>
      {syntheticTitle && (
        <header>
          <Heading as="h1">{syntheticTitle}</Heading>
        </header>
      )}
      <MDXContent>{children}</MDXContent>
    </div>
  );
}
