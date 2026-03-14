(() => {
  const PATTERNS = {
    email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    apiKey: /\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xoxb-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{20,})\b/g,
    jwt: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    cardCandidate: /\b(?:\d[ -]?){13,19}\b/g,
    phone: /\b(?:\+?\d{1,3}[ -]?)?(?:\(?\d{3}\)?[ -]?)?\d{3}[ -]?\d{2}[ -]?\d{2}\b/g,
    awsAccessKey: /\bAKIA[0-9A-Z]{16}\b/g,
    privateKeyBlock: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g
  };

  const MASKS = {
    email: "[HIDDEN_EMAIL]",
    apiKey: "[HIDDEN_API_KEY]",
    jwt: "[HIDDEN_JWT]",
    card: "[HIDDEN_CARD]",
    phone: "[HIDDEN_PHONE]",
    awsAccessKey: "[HIDDEN_AWS_KEY]",
    privateKey: "[HIDDEN_PRIVATE_KEY]"
  };

  function normalizeCardCandidate(value) {
    return value.replace(/[ -]/g, "");
  }

  function isLuhnValid(cardNumber) {
    let sum = 0;
    let shouldDouble = false;

    for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
      let digit = Number(cardNumber[index]);

      if (Number.isNaN(digit)) {
        return false;
      }

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  function addMatches(text, pattern, type, findings) {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      findings.push({
        type,
        match: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }

  function findSensitiveData(text) {
    const findings = [];

    addMatches(text, PATTERNS.email, "email", findings);
    addMatches(text, PATTERNS.apiKey, "apiKey", findings);
    addMatches(text, PATTERNS.jwt, "jwt", findings);
    addMatches(text, PATTERNS.phone, "phone", findings);
    addMatches(text, PATTERNS.awsAccessKey, "awsAccessKey", findings);

    for (const match of text.matchAll(PATTERNS.cardCandidate)) {
      const rawValue = match[0];
      const normalized = normalizeCardCandidate(rawValue);

      if (normalized.length < 13 || normalized.length > 19) {
        continue;
      }

      if (!isLuhnValid(normalized)) {
        continue;
      }

      findings.push({
        type: "card",
        match: rawValue,
        normalized,
        start: match.index,
        end: match.index + rawValue.length
      });
    }

    const privateKeyMatches = text.matchAll(PATTERNS.privateKeyBlock);
    for (const match of privateKeyMatches) {
      findings.push({
        type: "privateKey",
        match: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    findings.sort((left, right) => left.start - right.start);
    return findings;
  }

  function maskForType(type) {
    return MASKS[type] || "[HIDDEN]";
  }

  function maskText(text, findings) {
    if (!Array.isArray(findings) || findings.length === 0) {
      return text;
    }

    let cursor = 0;
    let result = "";

    for (const finding of findings) {
      if (finding.start < cursor) {
        continue;
      }

      result += text.slice(cursor, finding.start);
      result += maskForType(finding.type);
      cursor = finding.end;
    }

    result += text.slice(cursor);
    return result;
  }

  window.AIPrivacyDetector = {
    findSensitiveData,
    isLuhnValid,
    maskText
  };
})();
