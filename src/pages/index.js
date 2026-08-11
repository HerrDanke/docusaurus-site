import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import ThemedImage from '@theme/ThemedImage';

const sections = [
  {
    title: 'Tech',
    subtitle: '技术运维 · 服务器 · 网络 · 工具软件',
    to: '/Tech',
    color: '#007AFF',
  },
  {
    title: 'Assets',
    subtitle: 'AI 资产 · 智能体 · 技能库 · 流水线',
    to: '/Assets',
    color: '#5AC8FA',
  },
];

export default function Home() {
  return (
    <Layout title="ObsidiaNote" description="技术运维笔记与 AI 资产">
      <main style={{ padding: '80px 20px', textAlign: 'center' }}>
        <ThemedImage
          sources={{ light: 'img/logo.svg', dark: 'img/logo-dark.svg' }}
          alt="ObsidiaNote"
          width={72}
          height={72}
          style={{ display: 'inline-block' }}
        />
        <h1 style={{ fontSize: '2.5em', fontWeight: 700, margin: '16px 0 0' }}>ObsidiaNote</h1>
        <p style={{ color: '#8E8E93', marginTop: 12 }}>个人知识库 · 技术运维笔记与 AI 资产</p>
        <div
          style={{
            display: 'flex',
            gap: 20,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 48,
          }}
        >
          {sections.map((s) => (
            <Link
              key={s.title}
              to={s.to}
              style={{
                display: 'block',
                width: 260,
                padding: '32px 24px',
                borderRadius: 12,
                border: '0.5px solid #D1D1D6',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--ifm-background-color)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 600, color: s.color }}>{s.title}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: '#3C3C43' }}>{s.subtitle}</div>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
