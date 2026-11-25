(() => {
  'use strict';
  const data = window.SITE;
  let language = 'en', filter = 'all', selectedProject = null, toastTimer;
  const selectedImages = {};
  try {
    const requested = new URLSearchParams(location.search).get('lang');
    const currentDefault = localStorage.getItem('rui-language-version') === '2';
    const preferred = requested || (currentDefault ? localStorage.getItem('rui-language') : null);
    language = preferred === 'zh' ? 'zh' : 'en';
    if (!currentDefault) {
      localStorage.setItem('rui-language', language);
      localStorage.setItem('rui-language-version', '2');
    }
  } catch (_) {}
  const $ = (selector) => document.querySelector(selector);
  const t = (key) => data.ui[language][key] || key;
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const tags = (items) => items.map(item => `<span>${item}</span>`).join('');
  const escapeText = (value) => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  function mathDescription(description) {
    return description.split(/\\\(([\s\S]*?)\\\)/).map((part, index) => {
      const text = escapeText(part);
      return index % 2 ? `<span data-tex>${text}</span>` : text;
    }).join('');
  }
  function renderFormulas(container) {
    if (!window.katex) return;
    for (const element of container.querySelectorAll('[data-tex]')) {
      window.katex.render(element.textContent, element, {
        displayMode: element.classList.contains('project-equation'),
        output: 'htmlAndMathml',
        throwOnError: false,
        trust: false
      });
    }
  }
  function paperLinks(p) {
    const papers = p.papers || (p.publication ? [{label:t('paperLink')+' · DOI',url:p.publication}] : []);
    return papers.length ? `<div class="project-paper-links">${papers.map(paper=>`<a class="project-publication" href="${paper.url}" target="_blank" rel="noopener noreferrer">${paper.label} ↗</a>`).join('')}</div>` : '';
  }
  function demoLink(p) {
    return p.demo ? `<div class="demo-callout"><a class="demo-launch" href="${p.demo.url}?lang=${language}&v=generic-network" target="_blank" rel="noopener noreferrer">▶ ${t('runDemo')} ↗</a><p>${t('demoNote')}</p></div>` : '';
  }
  function sourceLink(p) {
    return p.code ? `<div class="project-paper-links"><a class="project-publication" href="${p.code}" target="_blank" rel="noopener noreferrer">${language === 'zh' ? '核心源码 · GitHub' : 'Core code · GitHub'}</a></div>` : '';
  }
  function embeddedDemo(p) {
    return p.demo ? `<details class="embedded-demo"><summary>${t('embedDemo')}</summary><div class="embed-heading"><span>${t('demoNote')}</span><a href="${p.demo.url}?lang=${language}&v=generic-network" target="_blank" rel="noopener noreferrer">${t('runDemo')} ↗</a></div><iframe data-demo-src="${p.demo.url}?lang=${language}&v=generic-network" title="${t('demoFrame')}" allow="fullscreen"></iframe></details>` : '';
  }
  function renderCredentials() {
    const awards = () => data.awards.map(g=>`<section class="award-group"><h3>${g[language]}</h3><ul class="award-list">${g.items.map(i=>`<li><span>${i[language]}</span><time>${i.year}</time></li>`).join('')}</ul></section>`).join('');
    const patents = () => data.patents.map((p,i)=>`<article class="patent-item"><h3>${i+1}. ${p[language]}</h3><p>${t('patentStatus')} · ${p.year} · ${p.id}</p></article>`).join('');
    ['#awards-list','#cv-awards-list'].forEach(id=>{if($(id))$(id).innerHTML=awards();});
    ['#patents-list','#cv-patents-list'].forEach(id=>{if($(id))$(id).innerHTML=patents();});
  }
  function resultsMarkup(p, detailed = false, showHeading = true) {
    const c = p[language];
    if (!c.results) return '';
    const table = detailed && p.comparison ? `<div class="results-table-wrap"><table class="results-table"><caption>${t('resultTableCaption')}</caption><thead><tr><th scope="col">${t('testCase')}</th><th scope="col">${t('plainFNO')}</th><th scope="col">${t('splitFNO')}</th></tr></thead><tbody>${p.comparison.map(r => `<tr><th scope="row">${r.case}</th><td>${r.plain}</td><td>${r.split}</td></tr>`).join('')}</tbody></table></div><p class="results-scope">${c.detailScope}</p>` : '';
    return `<div class="project-results">${detailed && showHeading ? `<h3>${t('keyResults')}</h3>` : ''}<ul>${c.results.map(r => `<li>${r}</li>`).join('')}</ul><p class="results-scope">${c.resultScope}</p>${table}</div>`;
  }
  function galleryMarkup(p, detailed = false) {
    const index = selectedImages[p.id] || 0, image = p.gallery[index];
    const thumbs = p.gallery.map((im, i) => `<button type="button" class="gallery-thumb" data-select-image="${i}" data-project-id="${p.id}" aria-pressed="${i === index}" aria-label="${im[language]}"><img src="${im.src}" alt="" loading="lazy"><span>${String(i+1).padStart(2,'0')}</span></button>`).join('');
    const main = `<img src="${image.src}" alt="${image[language]}${image.source ? ' · '+image.source : ''}" ${detailed ? '' : 'loading="lazy"'} width="900" height="570">`;
    return `<div class="project-gallery${detailed ? ' detailed-gallery' : ''}" role="group" aria-label="${t('galleryLabel')}">${detailed ? `<div class="gallery-stage">${main}</div>` : `<button type="button" class="gallery-stage" data-open-project="${p.id}" aria-label="${t('projectDetails')}: ${p[language].title}">${main}<span class="enlarge-hint" aria-hidden="true">↗</span></button>`}<div class="gallery-thumbnails">${thumbs}</div><div class="gallery-caption"><span>${image[language]}</span><span>${image.source || (index+1)+' / '+p.gallery.length}</span></div></div>`;
  }
  function publicationMarkup() {
    return data.publications.map(p => `<article class="publication-row"><span class="publication-year">${p.year}</span><div class="publication-body"><h3><a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.title}</a></h3><p class="publication-authors">${p.authors}</p><div class="publication-meta"><span class="publication-venue">${p.venue} ${p.year}</span><span>${t('published')}</span><span>${p.doi || p.note[language]}</span></div></div><a class="publication-arrow" href="${p.url}" aria-label="${t('paperLink')}: ${p.title}" target="_blank" rel="noopener noreferrer">↗</a></article>`).join('');
  }
  function renderProjects() {
    if (!$('#projects-grid')) return;
    $('#projects-grid').innerHTML = data.projects.filter(p => filter === 'all' || p.category.includes(filter)).map(p => {
      const c = p[language];
      return `<article class="project-row" data-project="${p.id}"><div class="project-figures">${galleryMarkup(p)}</div><div class="project-content"><p class="project-subtitle">${c.subtitle}</p><h3>${c.title}</h3><p class="project-summary">${c.summary}</p>${resultsMarkup(p)}<div class="project-tags">${tags(p.tags)}</div>${demoLink(p)}<div class="project-bottom"><time>${p.date}</time><button class="project-open" type="button" data-open-project="${p.id}">${t('projectDetails')} ↗</button></div>${paperLinks(p)}${sourceLink(p)}</div>${embeddedDemo(p)}</article>`;
    }).join('');
  }
  function renderDialog() {
    if (!selectedProject) return;
    const p = data.projects.find(p => p.id === selectedProject), c = p[language];
    const section = (key, body) => `<section class="project-detail-section" data-detail-section="${key}" aria-labelledby="detail-${key}"><h3 id="detail-${key}">${t(key)}</h3>${body}</section>`;
    const formulationItems = p.formulation || [];
    const formulation = formulationItems.map(item => `
      <div class="formulation-item">
        <div class="project-equation" data-tex>${escapeText(item.latex)}</div>
        <p>${mathDescription(language === 'zh' ? item.descriptionZh : item.description)}</p>
      </div>`).join('');
    const formulationSection = formulationItems.length ? section('mathematicalFormulation', formulation) : '';
    const results = `${resultsMarkup(p, true, false)}<p>${c.findings}</p>${galleryMarkup(p, true)}${p.publication || p.papers ? `<div class="figure-source">${t('sourceLabel')}: ${paperLinks(p)} · © 2024 OTC</div>` : ''}`;
    const dialogContent = $('#dialog-content');
    dialogContent.innerHTML = `<div class="dialog-body"><div class="eyebrow">${p.date} / ${c.subtitle}</div><h2 id="dialog-title">${c.title}</h2><p class="dialog-role">${c.role}</p><div class="project-tags">${tags(p.tags)}</div>${section('researchProblem', `<p>${escapeText(c.problem)}</p>`)}${formulationSection}${section('methodology', `<ul>${c.work.map(w => `<li>${w}</li>`).join('')}</ul><p class="method-tools">${c.methods}</p>`)}${section('resultsHeading', results)}${section('codeHeading', `<p>${escapeText(c.codeScope)}</p>${sourceLink(p)}${demoLink(p)}`)}</div>`;
    renderFormulas(dialogContent);
  }
  function educationMarkup() {
    return data.education.map((e, i) => { const c = e[language]; return `<article class="education-row"><time>${e.date}</time><div><h3>${c.school}</h3><p class="education-degree">${c.degree}</p><p>${c.detail}</p><p>${c.thesis}</p></div><span class="education-number">0${i+1}</span></article>`; }).join('');
  }
  function renderCV() {
    if (!$('#cv-research')) return;
    $('#cv-research').innerHTML = data.projects.map(p => { const c = p[language]; return `<article class="cv-block"><time>${p.date}</time><h3>${c.title}</h3><p>${c.role}</p>${resultsMarkup(p)}<ul>${c.work.map(w => `<li>${w}</li>`).join('')}</ul>${p.id === 'gas-network' ? `<p>${c.findings}</p>` : ''}</article>`; }).join('');
    $('#cv-software').innerHTML = data.experience.map(e => { const c = e[language]; return `<article class="cv-block"><time>${e.date}</time><h3>${c.title}</h3><p>${c.org}</p><p>${c.description}</p></article>`; }).join('');
  }
  function updateThemeControl() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('#theme-toggle')?.setAttribute('aria-pressed', String(dark));
    $('#theme-toggle')?.setAttribute('aria-label', t(dark ? 'themeLight' : 'themeDark'));
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#111b1b' : '#f8f9f5');
  }
  function render() {
    const displayName = language === 'zh' ? data.profile.chineseName : data.profile.name;
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = `${displayName} · ${document.body.dataset.page === 'cv' ? t('cvTitle') : t('heroStatement')}`;
    document.querySelectorAll('[data-profile-name]').forEach(element => { element.textContent = displayName; });
    $('.brand')?.setAttribute('aria-label', `${displayName} · ${t('home')}`);
    document.querySelector('meta[name=description]')?.setAttribute('content', language === 'zh' ? '薛睿的个人学术主页：科学计算、计算流体力学、降阶建模与科学机器学习。' : 'Rui Xue: scientific computing, computational fluid dynamics, reduced-order modeling, and scientific machine learning.');
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    document.querySelectorAll('[data-alt]').forEach(el => { el.alt = t(el.dataset.alt); });
    $('#language-toggle').innerHTML = `${language === 'zh' ? 'EN' : '中文'} <span>↗</span>`;
    $('#language-toggle').setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换为中文');
    $('#menu-toggle')?.setAttribute('aria-label', t($('#mobile-nav')?.hidden ? 'menuOpen' : 'menuClose'));
    $('#close-dialog')?.setAttribute('aria-label', t('close'));
    $('#project-filters')?.setAttribute('aria-label', language === 'zh' ? '按研究方向筛选项目' : 'Filter projects by research area');
    if ($('#interest-grid')) $('#interest-grid').innerHTML = data.interests.map(i => `<span class="interest-item">${language === 'zh' ? i.zh : i.title}</span>`).join('');
    if ($('#project-filters')) $('#project-filters').innerHTML = ['all','simulation','sciml'].map(f => `<button class="filter-button" type="button" data-filter="${f}" aria-pressed="${f === filter}">${t(f)}</button>`).join('');
    renderProjects();
    if ($('#publications-list')) $('#publications-list').innerHTML = publicationMarkup();
    if ($('#experience-list')) $('#experience-list').innerHTML = data.experience.map(e => { const c = e[language]; return `<article class="experience-item"><div><time>${e.date}</time><h3>${c.title}</h3><p class="experience-org">${c.org}</p><p class="experience-description">${c.description}</p></div>${e.gallery ? `<div class="experience-images">${e.gallery.map(im => `<figure><img src="${im.src}" alt="${im[language]}" loading="lazy" width="700" height="430"><figcaption>${im[language]}</figcaption></figure>`).join('')}</div>` : ''}</article>`; }).join('');
    if ($('#education-list')) $('#education-list').innerHTML = educationMarkup();
    renderCV(); renderCredentials(); renderDialog(); updateThemeControl();
  }
  $('#language-toggle').addEventListener('click', () => { language = language === 'zh' ? 'en' : 'zh'; save('rui-language', language); render(); });
  $('#theme-toggle').addEventListener('click', () => { const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = theme; save('rui-theme', theme); updateThemeControl(); });
  $('#menu-toggle')?.addEventListener('click', () => {
    const menu = $('#mobile-nav'); menu.hidden = !menu.hidden;
    $('#menu-toggle').setAttribute('aria-expanded', String(!menu.hidden));
    $('#menu-toggle').setAttribute('aria-label', t(menu.hidden ? 'menuOpen' : 'menuClose'));
  });
  $('#mobile-nav')?.addEventListener('click', e => { if (e.target.closest('a')) { $('#mobile-nav').hidden = true; $('#menu-toggle').setAttribute('aria-expanded','false'); $('#menu-toggle').setAttribute('aria-label', t('menuOpen')); } });
  document.addEventListener('click', e => {
    const imageButton = e.target.closest('[data-select-image]');
    if (imageButton) {
      selectedImages[imageButton.dataset.projectId] = Number(imageButton.dataset.selectImage);
      const insideDialog = !!imageButton.closest('dialog');
      renderProjects();
      if (selectedProject) renderDialog();
      const scope = insideDialog ? $('#dialog-content') : $('#projects-grid');
      scope.querySelector(`[data-project-id="${imageButton.dataset.projectId}"][data-select-image="${imageButton.dataset.selectImage}"]`)?.focus({preventScroll:true});
      return;
    }
    const filterButton = e.target.closest('[data-filter]');
    if (filterButton) { filter = filterButton.dataset.filter; $('#project-filters').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter))); renderProjects(); }
    const projectButton = e.target.closest('[data-open-project]');
    if (projectButton) { selectedProject = projectButton.dataset.openProject; renderDialog(); $('#project-dialog').showModal(); $('#project-dialog').scrollTop = 0; document.body.classList.add('dialog-open'); }
  });
  $('#close-dialog')?.addEventListener('click', () => $('#project-dialog').close());
  $('#project-dialog')?.addEventListener('close', () => { document.body.classList.remove('dialog-open'); selectedProject = null; });
  $('#project-dialog')?.addEventListener('click', e => { if(e.target === $('#project-dialog')) { const rect = e.target.getBoundingClientRect(); if(e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) e.target.close(); } });
  $('#copy-email')?.addEventListener('click', async () => {
    let message;
    try { await navigator.clipboard.writeText(data.profile.email); message = t('copied'); }
    catch (_) { message = t('copyFallback'); }
    $('#toast').textContent = message; $('#toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
  });
  $('#print-cv')?.addEventListener('click', () => window.print());
  document.addEventListener('toggle',e=>{
    const details=e.target;
    if(!(details instanceof HTMLDetailsElement)||!details.classList.contains('embedded-demo'))return;
    const frame=details.querySelector('iframe');
    if(details.open)frame.src=frame.dataset.demoSrc;else frame.removeAttribute('src');
  },true);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => { entries.forEach(entry => {
      if(entry.isIntersecting) document.querySelectorAll('.desktop-nav a').forEach(a => { const active = a.hash === '#' + entry.target.id; a.classList.toggle('active', active); if(active) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current'); });
    }); }, {rootMargin:'-15% 0px -65% 0px', threshold:0});
    document.querySelectorAll('section[id]').forEach(s => observer.observe(s));
  }
  render();
})();
