// AI Web İçerik Asistanı demo davranışları.

const HISTORY_STORAGE_KEY = 'ai-web-icerik-history';

const EXAMPLE_VALUES = {
    businessName: 'Atlas Hafriyat',
    sector: 'Hafriyat',
    services: 'Temel kazı, bina yıkımı, dolgu ve tesviye, altyapı hazırlığı, kepçe kiralama',
    tone: 'kurumsal',
    city: 'Aksaray',
    targetAudience: 'Kurumsal firmalar',
    language: 'tr',
    contentLength: 'orta'
};

const appState = {
    lastPayload: null,
    lastResult: null,
    versionIndex: 0,
    versionSeed: 0,
    history: []
};

let ui = {};

document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initAmbientParticles();
    initContentGenerator();
});

function initMobileNav() {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (!navToggle || !navLinks) {
        return;
    }

    navToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('is-open');
        navToggle.classList.toggle('is-active', isOpen);
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navLinks.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('is-open');
            navToggle.classList.remove('is-active');
            navToggle.setAttribute('aria-expanded', 'false');
        });
    });
}

function initAmbientParticles() {
    const particleContainer = document.getElementById('snowflakes');

    if (!particleContainer) {
        return;
    }

    for (let index = 0; index < 22; index += 1) {
        const particle = document.createElement('span');
        const size = randomBetween(6, 18);
        const duration = randomBetween(14, 28);
        const delay = randomBetween(0, 12);

        particle.className = 'particle';
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${randomBetween(0, 100)}%`;
        particle.style.bottom = `${randomBetween(-15, 30)}vh`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.animationDelay = `-${delay}s`;
        particleContainer.appendChild(particle);
    }
}

function initContentGenerator() {
    ui = getGeneratorElements();

    if (!ui.form || !ui.chatStream) {
        return;
    }

    appState.history = loadHistory();
    resetConversation();
    renderHistory();

    ui.form.addEventListener('submit', handleGenerateSubmit);
    ui.newVersionBtn.addEventListener('click', handleNewVersion);
    ui.downloadBtn.addEventListener('click', () => downloadText(appState.lastPayload, appState.lastResult));
    ui.fillExampleBtn.addEventListener('click', fillExample);
    ui.clearFormBtn.addEventListener('click', clearForm);

    ui.copyButtons.forEach((button) => {
        button.addEventListener('click', () => {
            copyText(getCopyValue(button.dataset.copyTarget));
        });
    });
}

function getGeneratorElements() {
    return {
        form: document.getElementById('contentGeneratorForm'),
        formFeedback: document.getElementById('formFeedback'),
        loadingState: document.getElementById('loadingState'),
        generateBtn: document.getElementById('generateBtn'),
        fillExampleBtn: document.getElementById('fillExampleBtn'),
        clearFormBtn: document.getElementById('clearFormBtn'),
        newVersionBtn: document.getElementById('newVersionBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        resultToolbar: document.getElementById('resultToolbar'),
        resultPanels: document.getElementById('resultPanels'),
        chatStream: document.getElementById('chatStream'),
        toastContainer: document.getElementById('toastContainer'),
        historyGrid: document.getElementById('historyGrid'),
        historyEmptyState: document.getElementById('historyEmptyState'),
        heroTitleHeading: document.getElementById('heroTitleHeading'),
        aboutTextHeading: document.getElementById('aboutTextHeading'),
        serviceTextHeading: document.getElementById('serviceTextHeading'),
        seoTitleHeading: document.getElementById('seoTitleHeading'),
        seoKeywordsHeading: document.getElementById('seoKeywordsHeading'),
        socialTextHeading: document.getElementById('socialTextHeading'),
        ctaTextHeading: document.getElementById('ctaTextHeading'),
        qualityScoreHeading: document.getElementById('qualityScoreHeading'),
        heroTitleOutput: document.getElementById('heroTitleOutput'),
        aboutTextOutput: document.getElementById('aboutTextOutput'),
        serviceTextOutput: document.getElementById('serviceTextOutput'),
        seoTitleOutput: document.getElementById('seoTitleOutput'),
        seoKeywordsOutput: document.getElementById('seoKeywordsOutput'),
        socialTextOutput: document.getElementById('socialTextOutput'),
        ctaTextOutput: document.getElementById('ctaTextOutput'),
        qualityScoreOutput: document.getElementById('qualityScoreOutput'),
        copyButtons: document.querySelectorAll('.copy-btn')
    };
}

async function handleGenerateSubmit(event) {
    event.preventDefault();

    const payload = getNormalizedPayload();
    const validationMessage = validatePayload(payload);

    if (validationMessage) {
        setFormFeedback(validationMessage, false);
        showToast(validationMessage, 'error');
        return;
    }

    appState.lastPayload = payload;
    appState.versionSeed = (appState.versionSeed + 1) % 3;
    appState.versionIndex = appState.versionSeed;

    startLoading();
    setFormFeedback('', false);

    await wait(1000);

    const result = renderGeneratedVersion(payload, appState.versionIndex, true);
    addToHistory(payload, result);
    stopLoading();
    setFormFeedback(getMessage(payload.language, 'successReady'), true);
    showToast(getMessage(payload.language, 'toastCompleted'), 'success');
}

async function handleNewVersion() {
    if (!appState.lastPayload) {
        showToast(getMessage('tr', 'needFirstGeneration'), 'error');
        return;
    }

    startLoading();
    setFormFeedback('', false);

    await wait(1000);

    appState.versionIndex = (appState.versionIndex + 1) % 3;
    const result = renderGeneratedVersion(appState.lastPayload, appState.versionIndex, false);
    addToHistory(appState.lastPayload, result);
    stopLoading();
    setFormFeedback(getMessage(appState.lastPayload.language, 'successReady'), true);
    showToast(getMessage(appState.lastPayload.language, 'newVersionReady'), 'success');
}

function renderGeneratedVersion(payload, versionIndex, appendUserPrompt) {
    const result = generateContent(payload, versionIndex);
    appState.lastResult = result;

    if (appendUserPrompt) {
        appendMessage(ui.chatStream, {
            role: 'user',
            label: payload.language === 'en' ? 'User' : 'Kullanıcı',
            html: `<p><strong>${escapeHtml(payload.businessName)}</strong> için ${escapeHtml(payload.city)} odaklı, ${escapeHtml(toTitleCase(payload.tone))} tonda ve ${escapeHtml(payload.sector)} sektörüne uygun içerik oluştur.</p><p>${escapeHtml(getMessage(payload.language, 'servicesLabel'))}: ${escapeHtml(payload.services)}.</p>`
        });
    }

    appendMessage(ui.chatStream, {
        role: 'ai',
        label: payload.language === 'en' ? 'AI Assistant' : 'AI Asistan',
        html: `<p>${escapeHtml(result.intro)}</p><p>${escapeHtml(getVersionReadyText(payload.language, versionIndex))}</p>`
    });

    updateResultPanels(payload, result);
    ui.resultToolbar.hidden = false;
    ui.resultPanels.hidden = false;
    ui.chatStream.scrollTop = ui.chatStream.scrollHeight;
    return result;
}

function updateResultPanels(payload, result) {
    const sectionLabels = getSectionLabels(payload.language);

    ui.heroTitleHeading.textContent = sectionLabels.heroTitle;
    ui.aboutTextHeading.textContent = sectionLabels.aboutText;
    ui.serviceTextHeading.textContent = sectionLabels.serviceText;
    ui.seoTitleHeading.textContent = sectionLabels.seoTitle;
    ui.seoKeywordsHeading.textContent = sectionLabels.seoKeywords;
    ui.socialTextHeading.textContent = sectionLabels.socialText;
    ui.ctaTextHeading.textContent = sectionLabels.ctaText;
    ui.heroTitleOutput.textContent = result.heroTitle;
    ui.aboutTextOutput.textContent = result.aboutText;
    ui.serviceTextOutput.textContent = result.serviceText;
    ui.seoTitleOutput.textContent = result.seoTitle;
    ui.socialTextOutput.textContent = result.socialText;
    ui.ctaTextOutput.textContent = result.ctaText;
    ui.qualityScoreHeading.textContent = getMessage(payload.language, 'qualityHeading');

    ui.seoKeywordsOutput.innerHTML = '';
    result.seoKeywords.forEach((keyword) => {
        const chip = document.createElement('span');
        chip.className = 'keyword-chip';
        chip.textContent = keyword;
        ui.seoKeywordsOutput.appendChild(chip);
    });

    ui.qualityScoreOutput.innerHTML = '';
    result.qualityScore.forEach((scoreItem) => {
        const stat = document.createElement('div');
        stat.className = 'quality-stat';
        stat.innerHTML = `<span>${escapeHtml(scoreItem.label)}</span><strong>${escapeHtml(scoreItem.value)}</strong>`;
        ui.qualityScoreOutput.appendChild(stat);
    });
}

function generateContent(payload, versionIndex) {
    const services = parseServices(payload.services);
    const serviceSentence = joinServices(services, payload.language);
    const toneStyle = getToneStyle(payload.tone, payload.language, payload.targetAudience, payload.contentLength);
    const audienceStyle = getAudienceStyle(payload.targetAudience, payload.language);
    const lengthStyle = getLengthStyle(payload.contentLength, payload.language);
    const qualityScore = generateQualityScore(payload, services);
    const seoKeywords = generateKeywords(payload, services);
    const socialText = generateSocialMediaText(payload, services, toneStyle, audienceStyle, lengthStyle);
    const variantTemplates = buildVersionTemplates(payload, services, serviceSentence, toneStyle, audienceStyle, lengthStyle);
    const selectedTemplate = variantTemplates[versionIndex] || variantTemplates[0];

    return {
        intro: selectedTemplate.intro,
        heroTitle: selectedTemplate.heroTitle,
        aboutText: selectedTemplate.aboutText,
        serviceText: selectedTemplate.serviceText,
        seoTitle: selectedTemplate.seoTitle,
        seoKeywords,
        socialText,
        ctaText: selectedTemplate.ctaText,
        qualityScore
    };
}

function buildVersionTemplates(payload, services, serviceSentence, toneStyle, audienceStyle, lengthStyle) {
    const cityLocative = payload.language === 'en' ? `in ${payload.city}` : withLocativeSuffix(payload.city);
    const primaryService = toTitleCase(services[0] || payload.sector);
    const secondaryService = toTitleCase(services[1] || payload.sector);
    const sectorLower = toLowerByLanguage(payload.sector, payload.language);

    if (payload.language === 'en') {
        return [
            {
                intro: `A refined website content pack has been prepared for ${payload.businessName} in ${payload.city}.`,
                heroTitle: `${primaryService} and ${secondaryService} solutions ${cityLocative} with ${toneStyle.hero}.`,
                aboutText: `${payload.businessName} is a professional ${sectorLower} business serving ${payload.city} with ${serviceSentence}. ${toneStyle.about} ${audienceStyle.about} ${lengthStyle.about}`,
                serviceText: `${serviceSentence} services are delivered with a structured and professional approach. ${toneStyle.service} ${lengthStyle.service}`,
                seoTitle: `${payload.city} ${payload.sector} Services | ${payload.businessName}`,
                ctaText: `${toneStyle.cta} ${payload.businessName} to discuss your project needs.`
            },
            {
                intro: `Version two has been created for ${payload.businessName} with a more focused brand tone.`,
                heroTitle: `${payload.sector} expertise ${cityLocative} for ${audienceStyle.hero}.`,
                aboutText: `${payload.businessName} stands out in ${payload.city} with ${serviceSentence}. ${toneStyle.aboutAlt} ${audienceStyle.aboutAlt} ${lengthStyle.aboutAlt}`,
                serviceText: `${payload.sector} solutions are presented with clear value, strong process planning and audience-focused messaging. ${toneStyle.serviceAlt} ${lengthStyle.service}`,
                seoTitle: `${payload.businessName} | ${payload.city} ${payload.sector} Solutions`,
                ctaText: `${toneStyle.ctaAlt} connect with ${payload.businessName} today.`
            },
            {
                intro: `A third content version has been generated for ${payload.businessName} with a stronger positioning style.`,
                heroTitle: `${payload.city} ${payload.sector} services with ${toneStyle.heroAlt}.`,
                aboutText: `${payload.businessName} provides ${serviceSentence} in ${payload.city}. ${toneStyle.aboutStrong} ${audienceStyle.aboutStrong} ${lengthStyle.aboutStrong}`,
                serviceText: `${serviceSentence} projects move forward with professional planning, suitable equipment and consistent communication. ${toneStyle.serviceStrong} ${lengthStyle.serviceStrong}`,
                seoTitle: `${payload.city} ${payload.sector} Company | ${payload.businessName}`,
                ctaText: `${toneStyle.ctaStrong} contact ${payload.businessName} now.`
            }
        ];
    }

    return [
        {
            intro: `${payload.businessName} için ${payload.city} merkezli, ${toneStyle.intro} bir içerik seti hazırlandı.`,
            heroTitle: `${cityLocative} ${primaryService} ve ${secondaryService} çözümlerinde ${toneStyle.hero}.`,
            aboutText: `${payload.businessName}, ${payload.city} bölgesinde ${serviceSentence} hizmetleri sunan profesyonel bir ${sectorLower} işletmesidir. ${toneStyle.about} ${audienceStyle.about} ${lengthStyle.about}`,
            serviceText: `${serviceSentence} alanlarında profesyonel çözümler sunulur. ${toneStyle.service} ${lengthStyle.service}`,
            seoTitle: `${payload.city} ${payload.sector} Hizmetleri | ${payload.businessName}`,
            ctaText: `${toneStyle.cta} ${payload.businessName} ile iletişime geçebilirsiniz.`
        },
        {
            intro: `${payload.businessName} için ikinci versiyon hazır. İçerik dili daha odaklı bir anlatımla yeniden kurgulandı.`,
            heroTitle: `${payload.city} için ${payload.sector} alanında ${toneStyle.hero}.`,
            aboutText: `${payload.businessName}, ${payload.city} genelinde ${serviceSentence} hizmetleriyle öne çıkan bir ${sectorLower} markasıdır. ${toneStyle.aboutAlt} ${audienceStyle.aboutAlt} ${lengthStyle.aboutAlt}`,
            serviceText: `${payload.sector} projelerinde ${serviceSentence} ihtiyaçlarına yönelik çözümler sunulur. ${toneStyle.serviceAlt} ${lengthStyle.service}`,
            seoTitle: `${payload.businessName} | ${payload.city} ${payload.sector} Çözümleri`,
            ctaText: `${toneStyle.ctaAlt} ${payload.businessName} ile hemen iletişime geçebilirsiniz.`
        },
        {
            intro: `${payload.businessName} için üçüncü versiyon üretildi. Bu taslakta daha güçlü vurgu ve daha akıcı cümle yapısı kullanıldı.`,
            heroTitle: `${cityLocative} ${payload.sector} hizmetlerinde ${toneStyle.heroAlt}.`,
            aboutText: `${payload.businessName}, ${payload.city} merkezli hizmet yapısıyla ${serviceSentence} alanlarında çözüm sunar. ${toneStyle.aboutStrong} ${audienceStyle.aboutStrong} ${lengthStyle.aboutStrong}`,
            serviceText: `${serviceSentence} hizmetleri, planlı süreç yönetimi ve ihtiyaç odaklı yaklaşım ile sunulur. ${toneStyle.serviceStrong} ${lengthStyle.serviceStrong}`,
            seoTitle: `${payload.city} ${payload.sector} Firması | ${payload.businessName}`,
            ctaText: `${toneStyle.ctaStrong} ${payload.businessName} ile şimdi iletişime geçin.`
        }
    ];
}

function generateSocialMediaText(payload, services, toneStyle, audienceStyle, lengthStyle) {
    const serviceSentence = joinServices(services.slice(0, payload.contentLength === 'uzun' ? 5 : 3), payload.language);

    if (payload.language === 'en') {
        const opening = `${payload.businessName} proudly delivers ${serviceSentence} in ${payload.city} for ${audienceStyle.socialAudience}.`;
        const middle = toneStyle.social;
        const ending = lengthStyle.social;
        return `${opening} ${middle} ${ending}`.trim();
    }

    const opening = `${payload.businessName} olarak ${payload.city}'da ${serviceSentence} hizmetlerinde profesyonel çözümler sunuyoruz.`;
    const middle = toneStyle.social;
    const ending = `${audienceStyle.socialAudience} için etkili sonuçlar üretmeye odaklanıyoruz. ${lengthStyle.social}`;
    return `${opening} ${middle} ${ending}`.trim();
}

function generateQualityScore(payload, services) {
    const base = payload.language === 'en' ? [
        { key: 'overall', label: 'Overall Quality' },
        { key: 'seo', label: 'SEO Fit' },
        { key: 'readability', label: 'Readability' },
        { key: 'corporate', label: 'Professional Tone' }
    ] : [
        { key: 'overall', label: 'Genel Kalite' },
        { key: 'seo', label: 'SEO Uyumu' },
        { key: 'readability', label: 'Okunabilirlik' },
        { key: 'corporate', label: 'Kurumsallık' }
    ];

    const toneBoost = {
        kurumsal: 4,
        premium: 5,
        profesyonel: 5,
        'güven veren': 4,
        modern: 3,
        resmi: 4,
        samimi: 2,
        sade: 1,
        'genç ve dinamik': 2,
        'satış odaklı': 3
    };

    const lengthBoost = {
        kısa: -2,
        orta: 2,
        uzun: 5
    };

    const audienceBoost = payload.targetAudience === 'Kurumsal firmalar' || payload.targetAudience === 'Premium müşteri kitlesi' ? 4 : 2;
    const seoBase = 82 + Math.min(services.length, 5) + (payload.city ? 2 : 0);
    const overallBase = 80 + (toneBoost[payload.tone] || 2) + (lengthBoost[payload.contentLength] || 0) + audienceBoost;
    const readabilityBase = 84 + (payload.contentLength === 'kısa' ? 4 : payload.contentLength === 'uzun' ? -1 : 2);
    const corporateBase = 81 + (toneBoost[payload.tone] || 2) + (payload.targetAudience === 'Kurumsal firmalar' ? 4 : 0);

    const valueMap = {
        overall: overallBase,
        seo: seoBase,
        readability: readabilityBase,
        corporate: corporateBase
    };

    return base.map((item) => ({
        label: item.label,
        value: `${Math.min(valueMap[item.key], 97)}/100`
    }));
}

function addToHistory(payload, result) {
    const historyItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        payload,
        result
    };

    appState.history = [historyItem, ...appState.history].slice(0, 3);
    saveHistory(appState.history);
    renderHistory();
}

function renderHistory() {
    if (!ui.historyGrid || !ui.historyEmptyState) {
        return;
    }

    ui.historyGrid.querySelectorAll('.history-card').forEach((card) => card.remove());
    ui.historyEmptyState.hidden = appState.history.length > 0;

    appState.history.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'history-card';
        card.tabIndex = 0;
        card.innerHTML = `
            <h4>${escapeHtml(item.payload.businessName)}</h4>
            <div class="history-meta">
                <div><span>${escapeHtml(getMessage(item.payload.language, 'sectorLabel'))}:</span> ${escapeHtml(item.payload.sector)}</div>
                <div><span>${escapeHtml(getMessage(item.payload.language, 'cityLabel'))}:</span> ${escapeHtml(item.payload.city)}</div>
                <div><span>${escapeHtml(getMessage(item.payload.language, 'toneLabel'))}:</span> ${escapeHtml(toTitleCase(item.payload.tone))}</div>
                <div><span>${escapeHtml(getMessage(item.payload.language, 'audienceLabel'))}:</span> ${escapeHtml(item.payload.targetAudience)}</div>
                <div><span>${escapeHtml(getMessage(item.payload.language, 'lengthLabel'))}:</span> ${escapeHtml(toTitleCase(item.payload.contentLength))}</div>
                <div><span>${escapeHtml(getMessage(item.payload.language, 'timeLabel'))}:</span> ${escapeHtml(formatTimestamp(item.timestamp, item.payload.language))}</div>
            </div>
        `;

        const restore = () => restoreHistoryItem(item.id);
        card.addEventListener('click', restore);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                restore();
            }
        });

        ui.historyGrid.appendChild(card);
    });
}

function restoreHistoryItem(itemId) {
    const historyItem = appState.history.find((item) => item.id === itemId);

    if (!historyItem) {
        return;
    }

    fillFormWithPayload(historyItem.payload);
    appState.lastPayload = historyItem.payload;
    appState.lastResult = historyItem.result;
    updateResultPanels(historyItem.payload, historyItem.result);
    ui.resultToolbar.hidden = false;
    ui.resultPanels.hidden = false;
    setFormFeedback(getMessage(historyItem.payload.language, 'historyRestored'), true);
    showToast(getMessage(historyItem.payload.language, 'historyToast'), 'success');
}

function loadHistory() {
    try {
        const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!rawHistory) {
            return [];
        }
        const parsed = JSON.parse(rawHistory);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory(historyItems) {
    try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyItems));
    } catch {
        // Demo akışında localStorage hatası kritik değil.
    }
}

async function copyText(text) {
    if (!text) {
        showToast(getMessage(appState.lastPayload?.language || 'tr', 'copyEmpty'), 'error');
        return;
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            fallbackCopyText(text);
        }
        showToast(getMessage(appState.lastPayload?.language || 'tr', 'copied'), 'success');
    } catch {
        showToast(getMessage(appState.lastPayload?.language || 'tr', 'copyFailed'), 'error');
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
}

function downloadText(payload, result) {
    if (!payload || !result) {
        showToast(getMessage('tr', 'downloadMissing'), 'error');
        return;
    }

    const qualityText = result.qualityScore.map((item) => `${item.label}: ${item.value}`).join(', ');
    const labels = getDownloadLabels(payload.language);
    const fileBody = [
        `${labels.businessName}: ${payload.businessName}`,
        `${labels.sector}: ${payload.sector}`,
        `${labels.city}: ${payload.city}`,
        `${labels.tone}: ${toTitleCase(payload.tone)}`,
        `${labels.audience}: ${payload.targetAudience}`,
        `${labels.language}: ${payload.language === 'en' ? 'English' : 'Türkçe'}`,
        `${labels.length}: ${toTitleCase(payload.contentLength)}`,
        '',
        `${labels.heroTitle}: ${result.heroTitle}`,
        '',
        `${labels.aboutText}: ${result.aboutText}`,
        '',
        `${labels.serviceText}: ${result.serviceText}`,
        '',
        `${labels.seoTitle}: ${result.seoTitle}`,
        '',
        `${labels.seoKeywords}: ${result.seoKeywords.join(', ')}`,
        '',
        `${labels.socialText}: ${result.socialText}`,
        '',
        `${labels.ctaText}: ${result.ctaText}`,
        '',
        `${labels.qualityScore}: ${qualityText}`
    ].join('\n');

    const blob = new Blob([fileBody], { type: 'text/plain;charset=utf-8' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${createSlug(payload.businessName)}-ai-icerik.txt`;
    downloadLink.click();
    URL.revokeObjectURL(downloadLink.href);

    showToast(getMessage(payload.language, 'downloaded'), 'success');
}

function showToast(message, type = 'success') {
    if (!ui.toastContainer) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast is-${type}`;
    toast.textContent = message;
    ui.toastContainer.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 2200);
}

function fillExample() {
    fillFormWithPayload(EXAMPLE_VALUES);
    setFormFeedback(getMessage('tr', 'exampleFilled'), true);
    showToast(getMessage('tr', 'exampleToast'), 'success');
}

function fillFormWithPayload(payload) {
    if (!ui.form) {
        return;
    }

    ui.form.elements.businessName.value = payload.businessName || '';
    ui.form.elements.sector.value = payload.sector || '';
    ui.form.elements.services.value = payload.services || '';
    ui.form.elements.tone.value = payload.tone || '';
    ui.form.elements.city.value = payload.city || '';
    ui.form.elements.targetAudience.value = payload.targetAudience || '';
    ui.form.elements.language.value = payload.language || 'tr';
    ui.form.elements.contentLength.value = payload.contentLength || '';
}

function clearForm() {
    if (!ui.form) {
        return;
    }

    ui.form.reset();
    appState.lastPayload = null;
    appState.lastResult = null;
    appState.versionIndex = 0;
    ui.resultToolbar.hidden = true;
    ui.resultPanels.hidden = true;
    ui.seoKeywordsOutput.innerHTML = '';
    ui.qualityScoreOutput.innerHTML = '';
    stopLoading();
    setFormFeedback('', false);
    resetConversation();
    showToast(getMessage('tr', 'formCleared'), 'success');
}

function resetConversation() {
    ui.chatStream.innerHTML = `
        <article class="chat-message user-message">
            <span class="message-label">Kullanıcı</span>
            <p>İşletme bilgilerini girerek ana sayfa ve hizmet metinleri oluşturmak istiyorum.</p>
        </article>
        <article class="chat-message ai-message welcome-message">
            <span class="message-label">AI Asistan</span>
            <p>Merhaba, işletmenize uygun web sitesi metinlerini üretmek için soldaki formu doldurun. Sonuçlar burada sohbet cevabı gibi görüntülenecek.</p>
        </article>
    `;
}

function getCopyValue(copyTarget) {
    if (!appState.lastResult) {
        return '';
    }

    const copyMap = {
        heroTitle: appState.lastResult.heroTitle,
        aboutText: appState.lastResult.aboutText,
        serviceText: appState.lastResult.serviceText,
        seoTitle: appState.lastResult.seoTitle,
        seoKeywords: appState.lastResult.seoKeywords.join(', '),
        socialText: appState.lastResult.socialText,
        ctaText: appState.lastResult.ctaText,
        qualityScore: appState.lastResult.qualityScore.map((item) => `${item.label}: ${item.value}`).join(', ')
    };

    return copyMap[copyTarget] || '';
}

function getNormalizedPayload() {
    const formData = new FormData(ui.form);

    return {
        businessName: toTitleCase(formData.get('businessName')?.toString() || ''),
        sector: normalizeWhitespace(formData.get('sector')?.toString() || ''),
        services: normalizeServiceInput(formData.get('services')?.toString() || ''),
        tone: normalizeWhitespace(formData.get('tone')?.toString() || '').toLocaleLowerCase('tr-TR'),
        city: toTitleCase(formData.get('city')?.toString() || ''),
        targetAudience: normalizeWhitespace(formData.get('targetAudience')?.toString() || ''),
        language: normalizeWhitespace(formData.get('language')?.toString() || 'tr'),
        contentLength: normalizeWhitespace(formData.get('contentLength')?.toString() || '').toLocaleLowerCase('tr-TR')
    };
}

function validatePayload(payload) {
    const validations = [
        ['businessName', getMessage(payload.language, 'validationBusiness')],
        ['sector', getMessage(payload.language, 'validationSector')],
        ['services', getMessage(payload.language, 'validationServices')],
        ['tone', getMessage(payload.language, 'validationTone')],
        ['city', getMessage(payload.language, 'validationCity')],
        ['targetAudience', getMessage(payload.language, 'validationAudience')],
        ['contentLength', getMessage(payload.language, 'validationLength')]
    ];

    const failed = validations.find(([field]) => !payload[field]);
    return failed ? failed[1] : '';
}

function setFormFeedback(message, isSuccess) {
    if (!ui.formFeedback) {
        return;
    }

    ui.formFeedback.textContent = message;
    ui.formFeedback.classList.toggle('is-success', Boolean(isSuccess && message));
}

function setLoading(isLoading) {
    ui.generateBtn.disabled = isLoading;
    ui.fillExampleBtn.disabled = isLoading;
    ui.clearFormBtn.disabled = isLoading;
    ui.newVersionBtn.disabled = isLoading;
    ui.downloadBtn.disabled = isLoading;
}

function startLoading() {
    setLoading(true);
    ui.loadingState.hidden = false;
    ui.loadingState.classList.add('is-visible');
}

function stopLoading() {
    setLoading(false);
    ui.loadingState.classList.remove('is-visible');
    ui.loadingState.hidden = true;
}

function getToneStyle(tone, language, targetAudience, contentLength) {
    if (language === 'en') {
        return getEnglishToneStyle(tone, targetAudience, contentLength);
    }

    return getTurkishToneStyle(tone, targetAudience, contentLength);
}

function getTurkishToneStyle(tone, targetAudience, contentLength) {
    const longer = contentLength === 'uzun';
    const audienceWord = targetAudience === 'Kurumsal firmalar' ? 'iş odaklı' : targetAudience === 'Yerel müşteriler' ? 'bölgesel' : 'hedef kitleye uygun';
    const styles = {
        kurumsal: {
            intro: 'profesyonel, güven veren ve kurumsal',
            hero: 'Güvenilir Hizmet',
            heroAlt: 'Kurumsal ve Güvenilir Çözümler',
            about: `Kurumsal hizmet anlayışıyla hareket eden işletme, güven, kalite ve zamanında teslim ilkelerini ön planda tutar${longer ? ' ve proje süreçlerini disiplinli biçimde yönetir' : ''}.`,
            aboutAlt: `İş süreçlerinde düzen, güven ve profesyonel iletişim çizgisi temel öncelikler arasındadır${longer ? '; bu yaklaşım marka algısını güçlendirir' : ''}.`,
            aboutStrong: `Kurumsal duruşu, sahadaki disiplinli iş yapısı ve güven veren iletişimiyle öne çıkar${longer ? ' ve uzun vadeli iş birliklerine uygun bir görünüm sunar' : ''}.`,
            service: 'Her proje, planlı çalışma düzeni ve operasyonel netlikle yürütülür.',
            serviceAlt: 'Sunulan hizmetler, kurumsal beklentilere uygun şekilde sistemli olarak ilerletilir.',
            serviceStrong: 'Sahadaki uygulama süreci, doğru ekipman ve net koordinasyonla tamamlanır.',
            social: `Güvenilir ekip, doğru ekipman ve ${audienceWord} iletişim yaklaşımıyla projelerinize değer katıyoruz.`,
            cta: 'Kurumsal web sitenizde güven veren bir mesaj kullanmak istiyorsanız',
            ctaAlt: 'Profesyonel marka anlatımını güçlendirmek için',
            ctaStrong: 'Kurumsal görünümünüzü güçlü bir içerikle desteklemek için'
        },
        samimi: {
            intro: 'sıcak, anlaşılır ve kullanıcıya yakın',
            hero: 'Samimi ve Güvenilir Hizmet',
            heroAlt: 'Yakın İletişim ve Güçlü Hizmet',
            about: 'Müşteri ihtiyaçlarını dikkatle dinleyen işletme, anlaşılır iletişim dili ve çözüm odaklı yaklaşımıyla öne çıkar.',
            aboutAlt: 'İşletme, müşterileriyle güvene dayalı ve sıcak bir iletişim kurmayı önemser.',
            aboutStrong: 'İletişimde sıcak ve ulaşılabilir bir ton benimseyerek ziyaretçide yakınlık duygusu oluşturur.',
            service: 'Hizmet süreçleri, açık iletişim ve pratik çözüm anlayışıyla ilerler.',
            serviceAlt: 'Her hizmet, kullanıcıyı yormayan net anlatım ve çözüm odaklı yaklaşım ile sunulur.',
            serviceStrong: 'İhtiyaçlar hızlıca anlaşılır, doğru yönlendirme ile süreç kolaylaştırılır.',
            social: 'Yakın iletişim, çözüm odaklı yaklaşım ve anlaşılır hizmet anlatımıyla işletmenizi güçlü biçimde tanıtıyoruz.',
            cta: 'Daha sıcak ve anlaşılır bir marka dili oluşturmak istiyorsanız',
            ctaAlt: 'Samimi ama etkili bir iletişim için',
            ctaStrong: 'Ziyaretçiye yakın duran bir web sitesi dili için'
        },
        premium: {
            intro: 'güçlü, seçkin ve prestij odaklı',
            hero: 'Üst Düzey Hizmet Deneyimi',
            heroAlt: 'Seçkin ve Prestijli Çözümler',
            about: 'Kalite odaklı yaklaşımıyla öne çıkan işletme, her projede yüksek standartlı hizmet deneyimi sunmayı hedefler.',
            aboutAlt: 'Hizmet dili, kalite algısını güçlendiren seçkin ve güven verici bir yapı taşır.',
            aboutStrong: 'Marka kimliği, prestijli duruşu ve nitelikli hizmet yaklaşımıyla farklılaşır.',
            service: 'Her hizmet, titiz planlama ve güçlü operasyon yönetimiyle uygulanır.',
            serviceAlt: 'Süreçler, seçkin hizmet beklentisini karşılayacak kalite anlayışıyla ilerletilir.',
            serviceStrong: 'Her adımda yüksek standart, güçlü koordinasyon ve etkili sonuç odağı korunur.',
            social: 'Seçkin hizmet algısı, güçlü ekip yönetimi ve kalite odaklı yaklaşım ile markanızı üst seviyede konumluyoruz.',
            cta: 'Markanızı daha prestijli bir anlatımla öne çıkarmak istiyorsanız',
            ctaAlt: 'Üst düzey hizmet algısı oluşturmak için',
            ctaStrong: 'Premium bir marka dili ve güçlü hizmet anlatımı için'
        },
        sade: {
            intro: 'kısa, net ve anlaşılır',
            hero: 'Net ve Etkili Çözümler',
            heroAlt: 'Basit, Açık ve Güvenilir Hizmet',
            about: 'İşletme, ihtiyaçları doğrudan anlayan ve çözümü açık biçimde sunan yalın bir hizmet yaklaşımı benimser.',
            aboutAlt: 'Gereksiz detaydan uzak, anlaşılır ve net bir marka diliyle iletişim kurar.',
            aboutStrong: 'Kısa, açık ve doğrudan anlatımıyla ziyaretçinin karar sürecini kolaylaştırır.',
            service: 'Her adım, anlaşılır planlama ve net hizmet anlatımı ile ilerler.',
            serviceAlt: 'Hizmetler, kısa ve açık cümlelerle ziyaretçiye kolay anlaşılır biçimde sunulur.',
            serviceStrong: 'İçerik yapısı, fazla kalabalık oluşturmadan temel faydayı doğrudan aktarır.',
            social: 'Kısa, net ve etkili bir anlatımla hizmetlerinizi sosyal medyada görünür hale getiriyoruz.',
            cta: 'Kısa ve anlaşılır bir web sitesi dili kullanmak istiyorsanız',
            ctaAlt: 'Net bir iletişim yapısı kurmak için',
            ctaStrong: 'Sade ama güçlü bir içerik kurgusu için'
        },
        'güven veren': {
            intro: 'tecrübe, güven ve kalite vurgusu güçlü',
            hero: 'Güvenilir ve Planlı Hizmet',
            heroAlt: 'Tecrübe ve Güven Odaklı Çözümler',
            about: 'İşletme, tecrübe, güven ve zamanında teslim ilkeleriyle hareket ederek ziyaretçide güçlü bir güven duygusu oluşturur.',
            aboutAlt: 'Marka dili, güven, kalite ve sürdürülebilir hizmet algısını destekleyecek biçimde kurgulanır.',
            aboutStrong: 'Tecrübeye dayanan iş yapısı ve güven veren iletişim tonu, firmanın öne çıkan yönlerindendir.',
            service: 'Her süreç, güvenilir ekip desteği ve planlı iş akışı ile ilerletilir.',
            serviceAlt: 'Hizmetler, kalite ve teslim güveni merkeze alınarak anlatılır.',
            serviceStrong: 'Proje süreçlerinde güven, düzen ve iş takibi vurgusu korunur.',
            social: 'Güvenilir ekip, kaliteli hizmet ve zamanında teslim anlayışıyla projelerinize sağlam bir zemin sunuyoruz.',
            cta: 'Güven odaklı bir hizmet anlatımı oluşturmak istiyorsanız',
            ctaAlt: 'Tecrübe ve kalite vurgusunu öne çıkarmak için',
            ctaStrong: 'Güven veren bir dijital görünüm oluşturmak için'
        },
        profesyonel: {
            intro: 'uzmanlık ve planlı çalışma vurgusu güçlü',
            hero: 'Uzmanlık Odaklı Hizmet',
            heroAlt: 'Profesyonel ve Planlı Çözümler',
            about: 'Alan uzmanlığını güçlü hizmet disipliniyle birleştiren işletme, projelerde profesyonel çözüm üretmeye odaklanır.',
            aboutAlt: 'Planlı iş yapısı ve uzman ekip desteği, marka anlatımının temel bileşenleri arasında yer alır.',
            aboutStrong: 'Uzmanlık, kalite ve disiplinli süreç yönetimi birlikte vurgulanır.',
            service: 'Süreçler, uzman ekip desteği ve sonuç odaklı planlamayla yürütülür.',
            serviceAlt: 'Her hizmet, profesyonel standartlara uygun şekilde planlanır ve uygulanır.',
            serviceStrong: 'İş akışı, kalite ölçütleri ve uzmanlık vurgusu korunarak ilerletilir.',
            social: 'Uzman ekip, planlı süreç ve güçlü hizmet kalitesiyle markanızı daha profesyonel şekilde anlatıyoruz.',
            cta: 'Profesyonel bir web sitesi dili oluşturmak istiyorsanız',
            ctaAlt: 'Uzmanlığınızı görünür kılmak için',
            ctaStrong: 'Planlı ve profesyonel bir içerik yapısı için'
        },
        'genç ve dinamik': {
            intro: 'enerjik, yenilikçi ve hareketli',
            hero: 'Dinamik ve Yenilikçi Hizmet',
            heroAlt: 'Enerjik ve Modern Çözümler',
            about: 'Enerjik marka diliyle öne çıkan işletme, güncel çözümleri hızlı iletişim ve aktif çalışma anlayışıyla sunar.',
            aboutAlt: 'Modern bakış açısı ve yenilikçi yaklaşımıyla dijital dünyada daha canlı bir görünüm oluşturur.',
            aboutStrong: 'Hareketli, güncel ve yenilikçi anlatımıyla kullanıcıda güçlü bir ilk izlenim bırakır.',
            service: 'Her proje, çevik planlama ve hızlı geri dönüş anlayışıyla ilerletilir.',
            serviceAlt: 'Hizmetler, dinamik marka dili ve enerjik iletişim yapısıyla sunulur.',
            serviceStrong: 'Yeni nesil yaklaşım, içerik akışında canlı ve etkili bir dil oluşturur.',
            social: 'Enerjik iletişim dili ve yenilikçi yaklaşım ile markanızı dijital dünyada daha canlı gösteriyoruz.',
            cta: 'Genç ve dinamik bir marka dili kurmak istiyorsanız',
            ctaAlt: 'Daha hareketli bir anlatım için',
            ctaStrong: 'Markanızı daha enerjik göstermek için'
        },
        resmi: {
            intro: 'ciddi, ölçülü ve mesafeli',
            hero: 'Disiplinli ve Resmî Hizmet',
            heroAlt: 'Ciddi ve Düzenli Çözüm Yapısı',
            about: 'İşletme, resmî iletişim çizgisi ve düzenli süreç yönetimiyle kurumsal ciddiyetini açık şekilde yansıtır.',
            aboutAlt: 'Dil yapısında ölçülülük, resmiyet ve kontrollü ifade biçimi ön plandadır.',
            aboutStrong: 'Kurumsal mesafe ve ciddiyet, içerik dilinin temel karakterini belirler.',
            service: 'Çalışmalar, belirlenen standartlara uygun biçimde planlı olarak yürütülür.',
            serviceAlt: 'Hizmet sunumu, ciddi ve ölçülü bir anlatım çizgisi içinde yapılandırılır.',
            serviceStrong: 'Mesafeli ancak güven veren anlatım yapısı korunur.',
            social: 'Ölçülü, ciddi ve güven veren bir iletişimle hizmetlerinizin kurumsal yönünü öne çıkarıyoruz.',
            cta: 'Resmî ve kurumsal bir anlatım benimsemek istiyorsanız',
            ctaAlt: 'Ciddi bir marka tonu oluşturmak için',
            ctaStrong: 'Mesafeli ama güçlü bir içerik kurgusu için'
        },
        modern: {
            intro: 'dijital, çağdaş ve yenilikçi',
            hero: 'Modern ve Etkili Çözümler',
            heroAlt: 'Çağdaş ve Dijital Hizmet Dili',
            about: 'Güncel marka diliyle konumlanan işletme, çağdaş hizmet yaklaşımını açık ve etkili bir anlatımla sunar.',
            aboutAlt: 'Dijital dünyaya uyumlu marka dili, yenilikçi ve güncel bir görünüm oluşturur.',
            aboutStrong: 'Çağdaş anlatımı ve yenilikçi hizmet bakışıyla markayı dijital olarak güçlendirir.',
            service: 'Projeler, güncel beklentilere uygun planlama ve etkili uygulama ile ilerletilir.',
            serviceAlt: 'İçerik dili, modern kullanıcı beklentilerine uygun şekilde sade ama etkili tutulur.',
            serviceStrong: 'Dijital odaklı anlatım, markanın güncel yapısını açık biçimde gösterir.',
            social: 'Çağdaş marka dili, dijital görünüm ve etkili hizmet anlatımıyla işletmenizi daha görünür kılıyoruz.',
            cta: 'Modern ve dijital odaklı bir içerik dili oluşturmak istiyorsanız',
            ctaAlt: 'Çağdaş bir marka anlatımı kurmak için',
            ctaStrong: 'Dijital görünümünüzü güçlendirmek için'
        },
        'satış odaklı': {
            intro: 'ikna edici ve aksiyon çağrısı güçlü',
            hero: 'Sonuç ve Dönüşüm Odaklı Hizmet',
            heroAlt: 'İletişime Geçiren Güçlü Çözümler',
            about: 'İşletme, değer önerisini net biçimde sunan ve ziyaretçiyi aksiyona yönlendiren güçlü bir iletişim dili kullanır.',
            aboutAlt: 'Metin yapısı, kullanıcıyı hızlı karar vermeye yönlendirecek ikna gücü üzerine kuruludur.',
            aboutStrong: 'Hizmet faydası açık biçimde vurgulanır ve ziyaretçiyi harekete geçiren mesajlar ön plana çıkar.',
            service: 'Hizmet anlatımı, karar verme sürecini hızlandıracak netlikte hazırlanır.',
            serviceAlt: 'Her cümle, dönüşüm hedefini destekleyecek biçimde kurgulanır.',
            serviceStrong: 'İletişime geçme motivasyonunu artıran güçlü çağrı mesajları korunur.',
            social: 'Güçlü değer önerisi ve net çağrı cümleleriyle hizmetlerinizi daha hızlı görünür ve tercih edilir hale getiriyoruz.',
            cta: 'Hızlı geri dönüş ve güçlü bir teklif metni oluşturmak istiyorsanız',
            ctaAlt: 'Dönüşüm odaklı bir iletişim dili için',
            ctaStrong: 'Ziyaretçiyi hızlı aksiyona yönlendiren bir içerik için'
        }
    };

    return styles[tone] || styles.kurumsal;
}

function getEnglishToneStyle(tone, targetAudience, contentLength) {
    const longer = contentLength === 'uzun';
    const audienceWord = targetAudience === 'Corporate companies' ? 'business-focused' : 'audience-aware';
    const styles = {
        kurumsal: {
            intro: 'professional, credible and corporate',
            hero: 'Reliable Service',
            heroAlt: 'Corporate and Reliable Solutions',
            about: `The brand highlights trust, quality and on-time delivery${longer ? ' while reinforcing structured project execution' : ''}.`,
            aboutAlt: 'Its communication style reflects order, trust and professional consistency.',
            aboutStrong: 'A disciplined service structure and a confident tone strengthen the brand image.',
            service: 'Each project is handled with operational clarity and structured planning.',
            serviceAlt: 'Services are positioned with a clear and corporate value proposition.',
            serviceStrong: 'Execution is supported by clear coordination and dependable processes.',
            social: `With a reliable team, the right equipment and a ${audienceWord} service mindset, we help projects move forward with confidence.`,
            cta: 'If you want a more credible corporate message, contact',
            ctaAlt: 'To strengthen your professional positioning, connect with',
            ctaStrong: 'For a stronger corporate content direction, contact'
        },
        samimi: {
            intro: 'warm, clear and approachable',
            hero: 'Friendly and Reliable Service',
            heroAlt: 'Approachable and Effective Solutions',
            about: 'The brand uses a warm communication style and an easy-to-understand service narrative.',
            aboutAlt: 'It focuses on building trust through approachable and helpful messaging.',
            aboutStrong: 'Its tone feels human, supportive and easy to connect with.',
            service: 'Services are explained with clarity, empathy and practical value.',
            serviceAlt: 'The service flow feels simple, understandable and user-friendly.',
            serviceStrong: 'Clear guidance and quick understanding make the offering easier to trust.',
            social: 'We present your services with a warm tone, clear value and a customer-friendly voice.',
            cta: 'If you want a more human and friendly brand voice, contact',
            ctaAlt: 'To build a warmer digital presence, reach out to',
            ctaStrong: 'For approachable yet professional content, contact'
        },
        premium: {
            intro: 'refined, premium and prestige-led',
            hero: 'Premium Service Experience',
            heroAlt: 'Prestigious and Elevated Solutions',
            about: 'The brand communicates exclusivity, high standards and refined service quality.',
            aboutAlt: 'Its content structure supports a more elevated and premium positioning.',
            aboutStrong: 'Prestige, confidence and high standards define the narrative.',
            service: 'Service delivery is described with precision, quality and strong execution.',
            serviceAlt: 'Every sentence supports a premium value proposition.',
            serviceStrong: 'The service story reinforces high standards and a distinguished identity.',
            social: 'We position your brand with premium language, high-value messaging and a refined service image.',
            cta: 'If you want a more premium brand voice, contact',
            ctaAlt: 'To elevate your service perception, connect with',
            ctaStrong: 'For a more distinguished digital presence, contact'
        },
        sade: {
            intro: 'short, direct and easy to read',
            hero: 'Clear and Effective Solutions',
            heroAlt: 'Simple and Trustworthy Service',
            about: 'The brand focuses on a straightforward service story without unnecessary detail.',
            aboutAlt: 'Its message stays short, readable and easy to understand.',
            aboutStrong: 'Clarity and direct value delivery define the tone.',
            service: 'Services are described with concise language and practical clarity.',
            serviceAlt: 'The content keeps the value proposition simple and accessible.',
            serviceStrong: 'The structure avoids clutter and keeps attention on the core offer.',
            social: 'We turn your services into short, clear and effective social media messaging.',
            cta: 'If you want concise and clear website content, contact',
            ctaAlt: 'To keep your message simple and effective, connect with',
            ctaStrong: 'For a minimal but strong content structure, contact'
        },
        'güven veren': {
            intro: 'trust-building and reliability-focused',
            hero: 'Reliable and Planned Service',
            heroAlt: 'Experience and Trust-Focused Solutions',
            about: 'The brand highlights experience, trust, quality and timely delivery.',
            aboutAlt: 'Its communication reinforces dependable service and long-term credibility.',
            aboutStrong: 'The narrative is built around reliability and proven delivery strength.',
            service: 'Each process is framed around consistency, trust and service confidence.',
            serviceAlt: 'The service story emphasizes quality and dependable delivery.',
            serviceStrong: 'The content keeps trust and process discipline highly visible.',
            social: 'We underline trust, quality and timely delivery to make your service promise clearer.',
            cta: 'If you want a more trust-driven service message, contact',
            ctaAlt: 'To strengthen credibility in your website copy, connect with',
            ctaStrong: 'For a stronger trust-focused digital presence, contact'
        },
        profesyonel: {
            intro: 'expert-led and professionally structured',
            hero: 'Expert-Led Service',
            heroAlt: 'Professional and Structured Solutions',
            about: 'The brand combines expertise with disciplined service planning.',
            aboutAlt: 'Its service story supports quality, experience and process control.',
            aboutStrong: 'Professional standards and execution quality shape the tone.',
            service: 'Services are framed through expertise, quality and structured workflow.',
            serviceAlt: 'Every line supports a professional and results-focused message.',
            serviceStrong: 'The content keeps expertise and planning highly visible.',
            social: 'We present your services with expert positioning, clarity and strong professional value.',
            cta: 'If you want a more professional website message, contact',
            ctaAlt: 'To showcase expertise more clearly, connect with',
            ctaStrong: 'For stronger expert-led website content, contact'
        },
        'genç ve dinamik': {
            intro: 'energetic, modern and forward-looking',
            hero: 'Dynamic and Innovative Service',
            heroAlt: 'Energetic and Modern Solutions',
            about: 'The brand uses energetic messaging and a fresh digital tone.',
            aboutAlt: 'Its content reflects speed, accessibility and a more current style.',
            aboutStrong: 'A lively and modern tone helps the brand feel more memorable.',
            service: 'Services are framed with agility, speed and a modern communication flow.',
            serviceAlt: 'The message feels fresh, active and easy to engage with.',
            serviceStrong: 'The content structure makes the offer feel alive and current.',
            social: 'We give your services an energetic and modern social media voice that feels current and visible.',
            cta: 'If you want a more dynamic brand voice, contact',
            ctaAlt: 'To create a more energetic website tone, connect with',
            ctaStrong: 'For a brighter and more modern digital presence, contact'
        },
        resmi: {
            intro: 'formal, measured and serious',
            hero: 'Disciplined and Formal Service',
            heroAlt: 'Serious and Structured Solutions',
            about: 'The content keeps a measured and formal communication line.',
            aboutAlt: 'Its narrative supports seriousness, structure and institutional distance.',
            aboutStrong: 'Professional distance and consistency shape the overall tone.',
            service: 'The service story remains formal, controlled and professionally structured.',
            serviceAlt: 'Services are explained with restraint and institutional clarity.',
            serviceStrong: 'A formal but trustworthy content structure is maintained.',
            social: 'We present your services with a formal and measured tone that supports institutional trust.',
            cta: 'If you want a more formal and serious tone, contact',
            ctaAlt: 'To strengthen institutional positioning, connect with',
            ctaStrong: 'For a more formal digital message, contact'
        },
        modern: {
            intro: 'digital, contemporary and innovation-led',
            hero: 'Modern and Effective Solutions',
            heroAlt: 'Contemporary and Digital Service Language',
            about: 'The brand adopts a contemporary tone that fits current digital expectations.',
            aboutAlt: 'Its message feels updated, relevant and aligned with digital branding.',
            aboutStrong: 'Modern communication and relevance shape the content direction.',
            service: 'Services are communicated with a digital-first, efficient and current tone.',
            serviceAlt: 'The language stays modern while keeping the message practical and useful.',
            serviceStrong: 'The content structure supports a strong contemporary brand image.',
            social: 'We shape your services into a digital-first and contemporary social media message.',
            cta: 'If you want a more modern digital voice, contact',
            ctaAlt: 'To refresh your website content with a contemporary tone, connect with',
            ctaStrong: 'For a more relevant and modern brand message, contact'
        },
        'satış odaklı': {
            intro: 'conversion-focused and persuasive',
            hero: 'Results-Driven Service',
            heroAlt: 'Action-Oriented and High-Impact Solutions',
            about: 'The brand uses persuasive language that supports action and lead generation.',
            aboutAlt: 'The content is shaped to support decision-making and stronger response rates.',
            aboutStrong: 'Every line is designed to make the service easier to choose.',
            service: 'The service story is structured to guide visitors toward contact and conversion.',
            serviceAlt: 'Each message supports stronger action and a clearer value proposition.',
            serviceStrong: 'Calls to action and service benefits remain highly visible.',
            social: 'We craft your services into persuasive social media content that encourages people to get in touch.',
            cta: 'If you want stronger action-driven messaging, contact',
            ctaAlt: 'To increase conversion potential, connect with',
            ctaStrong: 'For more persuasive lead-focused content, contact'
        }
    };

    return styles[tone] || styles.kurumsal;
}

function getAudienceStyle(targetAudience, language) {
    if (language === 'en') {
        const map = {
            'Bireysel müşteriler': {
                hero: 'individual customers',
                socialAudience: 'individual customers',
                about: 'The content speaks in a clear and accessible way for individual buyers.',
                aboutAlt: 'It keeps everyday needs and practical expectations visible.',
                aboutStrong: 'The message stays approachable and easy to trust for personal decisions.'
            },
            'Kurumsal firmalar': {
                hero: 'corporate buyers',
                socialAudience: 'corporate clients',
                about: 'The message emphasizes professionalism, process management and business reliability.',
                aboutAlt: 'It reflects a more structured and commercially focused tone.',
                aboutStrong: 'The narrative supports long-term business trust and operational discipline.'
            },
            'Öğrenciler': {
                hero: 'students',
                socialAudience: 'students',
                about: 'The wording stays simple, informative and easy to connect with for students.',
                aboutAlt: 'It feels accessible and more direct in tone.',
                aboutStrong: 'The content keeps clarity and ease of understanding at the center.'
            },
            'Aileler': {
                hero: 'families',
                socialAudience: 'families',
                about: 'The content highlights trust, accessibility and comfort for families.',
                aboutAlt: 'The tone feels warm and reassuring for household decisions.',
                aboutStrong: 'The message prioritizes comfort, clarity and trust.'
            },
            'Yerel müşteriler': {
                hero: 'local customers',
                socialAudience: 'local customers',
                about: 'The brand places stronger emphasis on local reach and service accessibility in the city.',
                aboutAlt: 'Regional trust and local familiarity become more visible.',
                aboutStrong: 'The city connection and local reliability stay highly present in the message.'
            },
            'Premium müşteri kitlesi': {
                hero: 'premium clients',
                socialAudience: 'premium clients',
                about: 'The message reinforces exclusivity, quality and a more elevated expectation level.',
                aboutAlt: 'The structure supports a premium and carefully positioned offer.',
                aboutStrong: 'Prestige and differentiated value remain visible throughout the narrative.'
            }
        };
        return map[targetAudience] || map['Bireysel müşteriler'];
    }

    const map = {
        'Bireysel müşteriler': {
            hero: 'bireysel müşteriler',
            socialAudience: 'bireysel müşteriler',
            about: 'Metin dili bireysel müşterilerin ihtiyaçlarını daha net ve anlaşılır şekilde karşılayacak biçimde kurgulanır.',
            aboutAlt: 'Karar verme sürecini kolaylaştıran açık ve doğrudan ifadeler tercih edilir.',
            aboutStrong: 'Hizmet faydaları, bireysel kullanıcı açısından net şekilde görünür hale getirilir.'
        },
        'Kurumsal firmalar': {
            hero: 'kurumsal firmalar',
            socialAudience: 'kurumsal firmalar',
            about: 'Metin yapısı kurumsal firmalara uygun, iş odaklı ve profesyonel bir çizgide hazırlanır.',
            aboutAlt: 'Hizmet kalitesi, süreç yönetimi ve iş disiplini daha görünür hale getirilir.',
            aboutStrong: 'Kurumsal iş birlikleri için güven veren ve planlı bir anlatım dili öne çıkar.'
        },
        'Öğrenciler': {
            hero: 'öğrenciler',
            socialAudience: 'öğrenciler',
            about: 'Anlatım dili daha sade, erişilebilir ve kolay anlaşılır biçimde şekillenir.',
            aboutAlt: 'Bilgilendirici ama yormayan bir ton korunur.',
            aboutStrong: 'Metin, öğrenmesi kolay ve hızlı anlaşılır bir yapı sunar.'
        },
        'Aileler': {
            hero: 'aileler',
            socialAudience: 'aileler',
            about: 'Metin dili güven, rahatlık ve erişilebilirlik vurgusunu daha görünür hale getirir.',
            aboutAlt: 'Ailelerin ihtiyaç duyduğu güven hissi ve açıklık ön planda tutulur.',
            aboutStrong: 'Hizmet anlatımı, ailelerin karar sürecine güven veren bir çerçeve sunar.'
        },
        'Yerel müşteriler': {
            hero: 'yerel müşteriler',
            socialAudience: 'yerel müşteriler',
            about: 'Şehir ve bölge vurgusu daha güçlü kullanılarak yerel müşterilere hitap eden bir dil benimsenir.',
            aboutAlt: 'Yerel erişim, bölgesel güven ve yakın hizmet algısı desteklenir.',
            aboutStrong: 'Bölgesel bilinirlik ve şehir odaklı güven mesajı daha belirgin hale gelir.'
        },
        'Premium müşteri kitlesi': {
            hero: 'premium müşteri kitlesi',
            socialAudience: 'premium müşteri kitlesi',
            about: 'Daha seçkin bir hedef kitleye hitap eden güçlü, kaliteli ve özenli bir anlatım benimsenir.',
            aboutAlt: 'Marka dili daha prestijli ve yüksek beklentilere uygun şekilde konumlandırılır.',
            aboutStrong: 'Kalite, farklılaşma ve üst düzey hizmet algısı daha görünür olur.'
        }
    };

    return map[targetAudience] || map['Bireysel müşteriler'];
}

function getLengthStyle(contentLength, language) {
    if (language === 'en') {
        const map = {
            kısa: {
                about: 'The explanation stays concise and focused.',
                aboutAlt: 'The wording remains compact and practical.',
                aboutStrong: 'Shorter messaging keeps the main value highly visible.',
                service: 'The service summary stays short and direct.',
                serviceStrong: 'The copy remains compact and action-oriented.',
                social: 'The post stays short, quick to read and easy to reuse.'
            },
            orta: {
                about: 'The explanation keeps a balanced level of detail.',
                aboutAlt: 'It combines clarity with enough supporting detail.',
                aboutStrong: 'The message stays informative without feeling long.',
                service: 'The service description gives clear and balanced detail.',
                serviceStrong: 'It stays descriptive while keeping the pace strong.',
                social: 'The post keeps a professional and balanced social media length.'
            },
            uzun: {
                about: 'The text expands the service value with more detailed brand context and operational reassurance.',
                aboutAlt: 'It offers a more detailed narrative that supports trust and positioning.',
                aboutStrong: 'The long form strengthens authority, brand story and perceived expertise.',
                service: 'The service explanation includes more detail about process, planning and delivery strength.',
                serviceStrong: 'The copy provides extra context to make the offer feel more complete and credible.',
                social: 'The post stays concise for social media while still carrying more descriptive brand detail.'
            }
        };
        return map[contentLength] || map.orta;
    }

    const map = {
        kısa: {
            about: 'Açıklama kısa ve doğrudan kalır.',
            aboutAlt: 'Metin fazla uzatılmadan temel faydayı vurgular.',
            aboutStrong: 'Kısa yapı, en önemli mesajların hızlı algılanmasını sağlar.',
            service: 'Hizmet açıklaması kısa ve net tutulur.',
            serviceStrong: 'Metin hızlı okunur ve kolay anlaşılır kalır.',
            social: 'Paylaşım metni kısa, etkili ve hızlı tüketilebilir yapıdadır.'
        },
        orta: {
            about: 'Açıklama dengeli uzunlukta ve yeterince bilgilendirici tutulur.',
            aboutAlt: 'Netlik ile açıklayıcılık arasında dengeli bir yapı kurulur.',
            aboutStrong: 'Metin akıcı kalırken yeterli detay sunar.',
            service: 'Hizmet açıklaması dengeli uzunlukta hazırlanır.',
            serviceStrong: 'Açıklama, temel faydayı yeterli detayla destekler.',
            social: 'Paylaşım metni profesyonel ve dengeli bir uzunlukta kalır.'
        },
        uzun: {
            about: 'Açıklama daha detaylı kurularak marka yaklaşımı, süreç yapısı ve hizmet değeri daha geniş biçimde anlatılır.',
            aboutAlt: 'Metin, güven ve uzmanlık algısını güçlendirecek daha kapsamlı bir kurguya sahip olur.',
            aboutStrong: 'Uzun yapı, markanın yetkinliğini ve hizmet kapsamını daha güçlü gösterir.',
            service: 'Hizmet açıklaması daha detaylı yazılarak süreç, planlama ve uygulama gücü daha açık biçimde aktarılır.',
            serviceStrong: 'Daha geniş açıklama, ziyaretçinin hizmeti zihninde netleştirmesine yardımcı olur.',
            social: 'Sosyal medya metni kısa yapısını korurken biraz daha açıklayıcı bir ton kazanır.'
        }
    };

    return map[contentLength] || map.orta;
}

function generateKeywords(payload, services) {
    if (payload.language === 'en') {
        const sectorLower = toLowerByLanguage(payload.sector, 'en');
        const baseKeywords = [
            `${payload.city} ${sectorLower}`,
            `${payload.city} ${sectorLower} services`,
            `${sectorLower} company`,
            `${payload.city} ${sectorLower} company`
        ];
        const serviceKeywords = services.slice(0, 5).flatMap((service) => {
            const lowerService = toLowerByLanguage(service, 'en');
            return [`${payload.city} ${lowerService}`, lowerService];
        });
        return uniqueList([...baseKeywords, ...serviceKeywords]).slice(0, 8);
    }

    const sectorLower = toTurkishLower(payload.sector);
    const baseKeywords = [
        `${payload.city} ${sectorLower}`,
        `${payload.city} ${sectorLower} hizmetleri`,
        `${sectorLower} firması`,
        `${payload.city} ${sectorLower} firması`
    ];

    const serviceKeywords = services.slice(0, 5).flatMap((service) => {
        const lowerService = toTurkishLower(service);
        return [`${payload.city} ${lowerService}`, lowerService];
    });

    return uniqueList([...baseKeywords, ...serviceKeywords]).slice(0, 8);
}

function loadHistory() {
    try {
        const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        const parsed = rawHistory ? JSON.parse(rawHistory) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function saveHistory(historyItems) {
    try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyItems));
    } catch {
        // localStorage başarısız olursa demo akışı devam eder.
    }
}

function getMessage(language, key) {
    const messages = {
        tr: {
            successReady: 'İçerik üretildi. Çıktıları ayrı ayrı kopyalayabilir veya indirebilirsiniz.',
            toastCompleted: 'AI içerik üretimi tamamlandı.',
            newVersionReady: 'Yeni versiyon hazırlandı.',
            needFirstGeneration: 'Önce içerik üretmelisiniz.',
            servicesLabel: 'Hizmetler',
            qualityHeading: 'İçerik Kalite Skoru',
            historyRestored: 'Geçmiş üretim yeniden yüklendi.',
            historyToast: 'Seçilen üretim tekrar görüntülendi.',
            copyEmpty: 'Kopyalanacak metin bulunamadı.',
            copied: 'Metin kopyalandı.',
            copyFailed: 'Metin kopyalanamadı.',
            downloadMissing: 'İndirilecek içerik bulunamadı.',
            downloaded: 'Metin indirildi.',
            exampleFilled: 'Örnek veriler forma yerleştirildi.',
            exampleToast: 'Örnek bilgiler dolduruldu.',
            formCleared: 'Form temizlendi.',
            validationBusiness: 'Lütfen işletme adını girin.',
            validationSector: 'Lütfen sektör seçimi yapın.',
            validationServices: 'Lütfen hizmet bilgilerini girin.',
            validationTone: 'Lütfen yazı tonu seçin.',
            validationCity: 'Lütfen şehir adını girin.',
            validationAudience: 'Lütfen hedef kitle seçin.',
            validationLength: 'Lütfen içerik uzunluğu seçin.',
            sectorLabel: 'Sektör',
            cityLabel: 'Şehir',
            toneLabel: 'Yazı tonu',
            audienceLabel: 'Hedef kitle',
            lengthLabel: 'İçerik uzunluğu',
            timeLabel: 'Üretim zamanı'
        },
        en: {
            successReady: 'Content is ready. You can copy each block or download the full text.',
            toastCompleted: 'AI content generation is complete.',
            newVersionReady: 'A new version is ready.',
            needFirstGeneration: 'Generate content first.',
            servicesLabel: 'Services',
            qualityHeading: 'Content Quality Score',
            historyRestored: 'Previous content has been restored.',
            historyToast: 'Selected generation is displayed again.',
            copyEmpty: 'No text available to copy.',
            copied: 'Text copied.',
            copyFailed: 'Text could not be copied.',
            downloadMissing: 'No content available for download.',
            downloaded: 'Text downloaded.',
            exampleFilled: 'Example data has been filled into the form.',
            exampleToast: 'Example values loaded.',
            formCleared: 'Form cleared.',
            validationBusiness: 'Please enter the business name.',
            validationSector: 'Please select a sector.',
            validationServices: 'Please enter services.',
            validationTone: 'Please select a writing tone.',
            validationCity: 'Please enter a city.',
            validationAudience: 'Please select a target audience.',
            validationLength: 'Please select content length.',
            sectorLabel: 'Sector',
            cityLabel: 'City',
            toneLabel: 'Tone',
            audienceLabel: 'Audience',
            lengthLabel: 'Content length',
            timeLabel: 'Generated at'
        }
    };

    return messages[language]?.[key] || messages.tr[key] || '';
}

function getVersionReadyText(language, versionIndex) {
    return language === 'en'
        ? `Version ${versionIndex + 1} is ready. You can use each content block separately below.`
        : `Versiyon ${versionIndex + 1} hazır. Aşağıdaki kartlarda tüm metinleri ayrı ayrı kullanabilirsiniz.`;
}

function getDownloadLabels(language) {
    if (language === 'en') {
        return {
            businessName: 'Business name',
            sector: 'Sector',
            city: 'City',
            tone: 'Tone',
            audience: 'Target audience',
            language: 'Language',
            length: 'Content length',
            heroTitle: 'Homepage hero title',
            aboutText: 'About text',
            serviceText: 'Service description',
            seoTitle: 'SEO title',
            seoKeywords: 'SEO keywords',
            socialText: 'Social media promo text',
            ctaText: 'Call to action',
            qualityScore: 'Content quality score'
        };
    }

    return {
        businessName: 'İşletme adı',
        sector: 'Sektör',
        city: 'Şehir',
        tone: 'Yazı tonu',
        audience: 'Hedef kitle',
        language: 'Dil seçimi',
        length: 'İçerik uzunluğu',
        heroTitle: 'Ana sayfa hero başlığı',
        aboutText: 'Hakkımızda metni',
        serviceText: 'Hizmet açıklaması',
        seoTitle: 'SEO başlığı',
        seoKeywords: 'SEO anahtar kelimeler',
        socialText: 'Sosyal medya tanıtım metni',
        ctaText: 'İletişim çağrısı',
        qualityScore: 'İçerik kalite skoru'
    };
}

function formatTimestamp(timestamp, language) {
    const date = new Date(timestamp);
    return date.toLocaleString(language === 'en' ? 'en-US' : 'tr-TR');
}

function toTitleCase(value) {
    return normalizeWhitespace(value)
        .split(/(\s+|\/+|-)/)
        .map((part) => {
            if (!part || /^(\s+|\/+|-)$/.test(part)) {
                return part;
            }

            const lowerPart = part.toLocaleLowerCase('tr-TR');
            return lowerPart.charAt(0).toLocaleUpperCase('tr-TR') + lowerPart.slice(1);
        })
        .join('');
}

function parseServices(services) {
    return normalizeWhitespace(services)
        .split(',')
        .map((service) => normalizeWhitespace(service).toLocaleLowerCase('tr-TR'))
        .filter(Boolean);
}

function normalizeServiceInput(services) {
    return parseServices(services)
        .map((service) => ensureSentence(service))
        .join(', ');
}

function joinServices(services, language) {
    if (services.length === 0) {
        return language === 'en' ? 'specialized services' : 'özel hizmet';
    }

    if (services.length === 1) {
        return services[0];
    }

    const connector = language === 'en' ? 'and' : 've';
    if (services.length === 2) {
        return `${services[0]} ${connector} ${services[1]}`;
    }

    return `${services.slice(0, -1).join(', ')} ${connector} ${services[services.length - 1]}`;
}

function ensureSentence(value) {
    const trimmedValue = normalizeWhitespace(value);
    return trimmedValue ? trimmedValue.replace(/[.\s]+$/u, '') : '';
}

function normalizeWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function toTurkishLower(value) {
    return normalizeWhitespace(value).toLocaleLowerCase('tr-TR');
}

function toLowerByLanguage(value, language) {
    return normalizeWhitespace(value).toLocaleLowerCase(language === 'en' ? 'en-US' : 'tr-TR');
}

function withLocativeSuffix(city) {
    const normalizedCity = normalizeWhitespace(city);
    if (!normalizedCity) {
        return city;
    }

    const lowerCity = normalizedCity.toLocaleLowerCase('tr-TR');
    const vowels = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
    const hardConsonants = ['ç', 'f', 'h', 'k', 'p', 's', 'ş', 't'];
    const lastVowel = [...lowerCity].reverse().find((character) => vowels.includes(character)) || 'a';
    const lastLetter = lowerCity.charAt(lowerCity.length - 1);
    const baseSuffix = ['a', 'ı', 'o', 'u'].includes(lastVowel) ? 'da' : 'de';
    const suffix = hardConsonants.includes(lastLetter) ? `t${baseSuffix.slice(1)}` : baseSuffix;
    return `${normalizedCity}'${suffix}`;
}

function uniqueList(items) {
    return [...new Set(items.filter(Boolean).map((item) => normalizeWhitespace(item)))];
}

function createSlug(value) {
    return normalizeWhitespace(value)
        .toLocaleLowerCase('tr-TR')
        .replaceAll('ı', 'i')
        .replaceAll('ğ', 'g')
        .replaceAll('ü', 'u')
        .replaceAll('ş', 's')
        .replaceAll('ö', 'o')
        .replaceAll('ç', 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function appendMessage(chatStream, message) {
    const article = document.createElement('article');
    article.className = `chat-message ${message.role === 'ai' ? 'ai-message' : 'user-message'}`;
    article.innerHTML = `<span class="message-label">${message.label}</span>${message.html}`;
    chatStream.appendChild(article);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function wait(duration) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, duration);
    });
}

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function getSectionLabels(language) {
    if (language === 'en') {
        return {
            heroTitle: 'Homepage hero title',
            aboutText: 'About text',
            serviceText: 'Service description',
            seoTitle: 'SEO title',
            seoKeywords: 'SEO keywords',
            socialText: 'Social media promo text',
            ctaText: 'Call to action'
        };
    }

    return {
        heroTitle: 'Ana sayfa hero başlığı',
        aboutText: 'Hakkımızda metni',
        serviceText: 'Hizmet açıklaması',
        seoTitle: 'SEO başlığı',
        seoKeywords: 'SEO anahtar kelimeler',
        socialText: 'Sosyal medya tanıtım metni',
        ctaText: 'İletişim çağrısı'
    };
}