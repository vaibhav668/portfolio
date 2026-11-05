import { profile, education, experience, projects, skills, achievements, positions, contact } from './portfolioData.js';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Photo sets: { title, photos: [{ src, alt, wide?, focus? }] }. A `wide` photo spans both columns;
// `focus` is a CSS object-position that picks which part of the photo stays in view when cropped.
const galleries = (list = []) => list.map((gal) => `
  <figure class="pos-gallery">
    <div class="pos-photos${gal.photos.length === 1 ? ' single' : ''}${gal.landscape ? ' land' : ''}">${gal.photos.map((ph) => `<a href="${esc(ph.src)}" target="_blank" rel="noopener"${ph.wide ? ' class="wide"' : ''}><img src="${esc(ph.src)}" alt="${esc(ph.alt)}" loading="lazy"${ph.focus ? ` style="object-position:${esc(ph.focus)}"` : ''}></a>`).join('')}</div>
    <figcaption>${esc(gal.title)}</figcaption>
  </figure>`).join('');
const ext = (url, label, kind = 'ghost') => `<a class="btn btn-${kind}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

export const SECTIONS = [
  { id: 'about', label: 'About', station: 0 },
  { id: 'education', label: 'Education', station: 1 },
  { id: 'skills', label: 'Skills', station: 2 },
  { id: 'experience', label: 'Experience', station: 3 },
  { id: 'projects', label: 'Projects', station: 4 },
  { id: 'achievements', label: 'Achievements', station: 5 },
  { id: 'visor', label: 'VISOR', station: 6 },
  { id: 'contact', label: 'Contact', station: 7 },
];

export function renderSection(id, item) {
  switch (id) {
    case 'about': return {
      title: profile.name, kicker: 'Island entrance',
      html: `
        <div class="about-head">
          <img class="avatar" src="${esc(profile.avatar)}" alt="Vaibhav Pokhriyal" onerror="this.style.display='none'">
          <div>
            <p class="roles">${esc(profile.title)}</p>
            <p class="focus">${profile.focus.map(esc).join(' · ')}</p>
            <p class="status"><span class="dot"></span>${esc(profile.status)}</p>
          </div>
        </div>
        <p class="lead">${esc(profile.summary)}</p>
        <div class="facts">
          <div><span class="k">Studying</span><span>${esc(education[0].degree)}, ${esc(education[0].institution)} (${esc(education[0].period)})</span></div>
          ${experience.map((e) => `<div><span class="k">${esc(e.role)}</span><span>${esc(e.short)}, ${esc(e.period)}</span></div>`).join('')}
          <div><span class="k">Built</span><span>${projects.length} projects across agentic AI, computer vision and robotics</span></div>
        </div>
        <div class="actions">${ext(profile.resume, 'Download resume', 'solid')}${ext('https://github.com/vaibhav668', 'GitHub')}<button class="btn btn-ghost" data-open="contact">Contact</button></div>`,
    };
    case 'education': {
      const ed = education[0];
      return {
        title: 'Education', kicker: 'The Academy',
        html: `
          <figure class="edu-photo">
            <img src="${esc(ed.image)}" alt="Aerial view of the GBPIET campus on a ridge in the Garhwal hills at sunset">
            <figcaption>${esc(ed.institution)} campus, ${esc(ed.location)}</figcaption>
          </figure>
          <article class="edu-card">
            <p class="period">${esc(ed.period)}</p>
            <h3>${esc(ed.fullDegree)}</h3>
            <p class="org">${esc(ed.institution)}, ${esc(ed.location)}</p>
          </article>
          <h4 class="sub">Timeline</h4>
          <ol class="timeline">
            <li><span class="when">2024</span><div><strong>Started B.Tech at ${esc(ed.institution)}</strong><p>Computer Science and Engineering, specialising in AI & ML.</p></div></li>
            <li><span class="when">2028</span><div><strong>Expected graduation</strong><p>${esc(ed.degree)}, ${esc(ed.institution)}.</p></div></li>
          </ol>`,
      };
    }
    case 'skills': return {
      title: 'Skills', kicker: 'Toolkit',
      html: `<dl class="skill-list">${skills.map((c) => `<div><dt>${esc(c.category)}</dt><dd>${c.items.map(esc).join(', ')}</dd></div>`).join('')}</dl>`,
    };
    case 'experience': {
      return {
        title: 'Experience', kicker: 'Work & research',
        html: `
          ${experience.map((e) => `
          <article class="exp">
            <div class="exp-head">
              ${e.logo ? `<img src="${esc(e.logo)}" alt="${esc(e.org)} logo" class="exp-logo${e.logoDark ? ' exp-logo-dark' : ''}">` : `<span class="exp-logo exp-mono" aria-hidden="true">${esc(e.short.split(' ').map((w) => w[0]).join('').slice(0, 3))}</span>`}
              <div><h3>${esc(e.role)}</h3><p class="org">${esc(e.org)}</p><p class="meta">${esc(e.unit)}, ${esc(e.mode)}, ${esc(e.period)}</p>${e.mentor ? `<p class="meta">Under ${esc(e.mentor)}</p>` : ''}</div>
            </div>
            <ul class="points">${e.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
            <p class="stack"><span class="k">Stack</span> ${e.tags.map(esc).join(', ')}</p>
            ${e.links.length ? `<div class="actions">${e.links.map((l, i) => ext(l.url, l.label, i ? 'ghost' : 'solid')).join('')}</div>` : ''}
          </article>`).join('')}
          <h4 class="sub">Positions of responsibility</h4>
          ${positions.map((po) => `
          <article class="pos">
            <h3>${esc(po.role)}</h3><p class="org">${esc(po.org)}</p>
            <ul class="points">${po.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
            ${galleries(po.galleries)}
            ${(po.subsections || []).map((sub) => `
            <section class="pos-sub">
              <h5>${esc(sub.title)}</h5>
              <ul class="points">${sub.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
              ${galleries(sub.galleries)}
            </section>`).join('')}
          </article>`).join('')}`,
      };
    }
    case 'projects': {
      const p = projects.find((x) => x.id === item) || projects[0];
      return {
        title: 'Projects', kicker: 'Project Hall',
        html: `
          <nav class="proj-tabs" aria-label="Projects">${projects.map((x) => `<button data-project="${x.id}" aria-current="${x.id === p.id}">${esc(x.name)}</button>`).join('')}</nav>
          <article class="proj" data-id="${p.id}">
            ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)} screenshot" class="proj-img"${p.imageAspect ? ` style="aspect-ratio:${p.imageAspect};object-fit:contain"` : ''}>` : `<div class="proj-img proj-ph"><span>${esc(p.name)}</span></div>`}
            <h3>${esc(p.fullName || p.name)}</h3>
            <p class="tagline">${esc(p.tagline)}</p>
            ${p.context ? `<p class="meta">${esc(p.context)}</p>` : ''}
            ${p.award ? `<p class="place place-1">${esc(p.award)}</p>` : ''}
            <p>${esc(p.description)}</p>
            <ul class="points">${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            <p class="stack"><span class="k">Stack</span> ${p.tech.map(esc).join(', ')}</p>
            ${p.github || p.demo ? `<div class="actions">${p.github ? ext(p.github, 'View on GitHub', 'solid') : ''}${p.demo ? ext(p.demo, 'Watch demo on LinkedIn') : ''}</div>` : ''}
          </article>`,
      };
    }
    case 'achievements': return {
      title: 'Achievements', kicker: 'Awards & competitions',
      html: achievements.map((a) => `
        <article class="ach ${a.id === item ? 'focus' : ''}" id="ach-${a.id}">
          ${a.image ? `<img src="${esc(a.image)}" alt="${esc(a.title)}" class="ach-img"${a.imageFocus ? ` style="object-position:${esc(a.imageFocus)}"` : ''}>` : `<div class="ach-img ach-ph" aria-hidden="true">★</div>`}
          <div>
            <p class="place place-${a.rank}">${esc(a.place)}</p>
            <h3>${esc(a.title)}</h3>
            <p class="meta">${esc(a.event)}</p>
            <p>${esc(a.description)}</p>
            <p class="detail">${esc(a.detail)}</p>
          </div>
          ${a.galleries ? `<div class="ach-gallery">${galleries(a.galleries)}</div>` : ''}
        </article>`).join(''),
    };
    case 'contact': return {
      title: 'Contact', kicker: 'Comm Tower',
      html: `
        <p class="finale">Thanks for exploring my world.</p>
        <p class="finale-sub">Let’s build something amazing together.</p>
        <p class="muted">${esc(profile.openTo)}</p>
        <ul class="contact-list">${contact.map((c) => `
          <li><a href="${esc(c.url)}" ${c.url.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
            <span class="c-label">${esc(c.label)}</span><span class="c-val">${esc(c.value)}</span></a></li>`).join('')}
        </ul>`,
    };
    default: return { title: id, kicker: '', html: '' };
  }
}

// Local keyword search over the portfolio. No AI backend: plain matching on real data.
export function searchPortfolio(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hit = (...fields) => fields.flat().some((f) => String(f).toLowerCase().includes(q));
  const out = [];
  for (const p of projects) if (hit(p.name, p.description, p.tech, p.features)) out.push({ section: 'projects', item: p.id, label: p.name, sub: 'Project' });
  for (const e of experience) if (hit(e.role, e.org, e.unit, e.points, e.tags)) out.push({ section: 'experience', label: `${e.role}, ${e.short}`, sub: 'Experience' });
  for (const po of positions) if (hit(po.role, po.org, po.points, (po.subsections || []).map((x) => [x.title, x.points]))) out.push({ section: 'experience', label: po.role, sub: po.org });
  for (const a of achievements) if (hit(a.title, a.event, a.description, a.detail)) out.push({ section: 'achievements', item: a.id, label: a.title, sub: a.place });
  for (const c of skills) { const m = c.items.filter((s) => s.toLowerCase().includes(q)); if (m.length) out.push({ section: 'skills', label: m.join(', '), sub: c.category }); }
  const ed = education[0];
  if (hit(ed.institution, ed.degree, ed.location)) out.push({ section: 'education', label: `${ed.degree}, ${ed.institution}`, sub: 'Education' });
  for (const c of contact) if (hit(c.label, c.value)) out.push({ section: 'contact', label: c.value, sub: c.label });
  return out.slice(0, 8);
}

// Guide dialogue, built from the data.
export const GUIDE_LINES = {
  intro: [
    `Hey, I’m ${profile.firstName}. Welcome to my little corner of the universe.`,
    'Instead of scrolling through a portfolio, let’s explore my journey together. I study AI & ML, did research at IIT Delhi, built voice AI agents at Mind Masters AI, and build things with vision, language models and robots.',
    'Follow the stone path. There’s something interesting around every corner, and I’ll walk ahead to show you.',
  ],
  education: `This is where it started: ${education[0].degree} at ${education[0].institution}. Step inside the dome.`,
  skills: 'My toolkit. Python and PyTorch do most of the heavy lifting around here.',
  experience: 'Voice AI agents at Mind Masters AI, and EEG research at IIT Delhi’s Neuro Computing Lab. Plus the clubs and events I help run.',
  projects: `${projects.length} things I built. Walk up to any pedestal to inspect it.`,
  achievements: 'A hackathon award for NetraVaani, Micromouse mazes and robo-soccer. Some of my favourite memories.',
  visor: 'VISOR knows everything on this island. Use it as a shortcut to any section.',
  contact: 'That’s the tour. If you liked it, let’s talk.',
};
