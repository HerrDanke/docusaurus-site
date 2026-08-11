import React from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';

/**
 * 分区落地页（/Tech、/Assets）。
 *
 * 由 landing 插件在构建期注入为 exact 叶子路由：卡片数据（cards）在
 * contentLoaded 阶段从 docs 插件的全量内容算好，序列化进路由 props，
 * 因此 /Tech、/Assets 会被 SSG 成静态 HTML（build/Tech/index.html 等），
 * 直链无需应用壳，也消除了空壳带来的 hydration mismatch（React #418）。
 */
export default function LandingPage({ cards, section }) {
  return (
    <Layout title={section.label} description={section.subtitle}>
      <main style={{ padding: '72px 24px', maxWidth: 960, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.2em', fontWeight: 700, margin: 0 }}>
          {section.label}
        </h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginTop: 8 }}>
          {section.subtitle}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
            marginTop: 36,
          }}
        >
          {cards.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              style={{
                display: 'block',
                padding: '20px 18px',
                borderRadius: 12,
                border: '0.5px solid var(--ifm-color-emphasis-300)',
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--ifm-background-color)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 600 }}>{c.title}</div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: 'var(--ifm-color-emphasis-600)',
                }}
              >
                {c.subtitle}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
