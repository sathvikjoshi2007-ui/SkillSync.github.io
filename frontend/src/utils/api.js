// api.js — localStorage-based API service layer
// Replaces all http://localhost:5000 backend calls so the app works
// as a fully static site on GitHub Pages.

const USERS_KEY = 'skillsync_users';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function findUser(email) {
  return getUsers().find((u) => u.email === email) || null;
}

function updateUserField(email, updates) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) return null;
  Object.assign(users[idx], updates);
  saveUsers(users);
  return users[idx];
}

// Simple hash for demo purposes (NOT cryptographically secure)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────
export async function signup(name, email, password) {
  const users = getUsers();
  if (users.find((u) => u.email === email)) {
    throw { response: { data: { message: 'Email already registered' } } };
  }
  const user = {
    _id: String(Date.now()),
    name,
    email,
    password: simpleHash(password),
    job: '',
    skills: [],
    skills_to_improve: [],
    tagline: 'A catchy tagline!',
  };
  users.push(user);
  saveUsers(users);
  return { data: { message: 'Signup successful' } };
}

export async function login(email, password) {
  const user = findUser(email);
  if (!user || user.password !== simpleHash(password)) {
    throw { response: { data: { message: 'Invalid email or password' } } };
  }
  return {
    data: {
      message: 'Login successful',
      user: {
        name: user.name,
        email: user.email,
        tagline: user.tagline || 'A catchy tagline!',
      },
    },
  };
}

// ──────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────
export async function getSkills(email) {
  const user = findUser(email);
  return { data: { skills: user ? user.skills || [] : [] } };
}

export async function addSkill(email, skill) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.email === email);
  if (idx === -1) throw { response: { data: { message: 'User not found' } } };

  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const skillObject = { date: currentDate, title: skill };

  if (!Array.isArray(users[idx].skills)) users[idx].skills = [];
  users[idx].skills.push(skillObject);
  saveUsers(users);
  return { data: { message: 'Skill added successfully', skill: skillObject } };
}

// ──────────────────────────────────────────────
// Job
// ──────────────────────────────────────────────
export async function getJob(email) {
  const user = findUser(email);
  const job = user?.job || 'Developer';
  return { data: { job } };
}

export async function updateJob(email, job) {
  updateUserField(email, { job });
  return { data: { message: 'Job updated successfully' } };
}

// ──────────────────────────────────────────────
// Tagline
// ──────────────────────────────────────────────
export async function getTagline(email) {
  const user = findUser(email);
  return { data: { tagline: user?.tagline || 'A catchy tagline!' } };
}

export async function updateTagline(email, tagline) {
  updateUserField(email, { tagline });
  return { data: { message: 'Tagline updated successfully' } };
}

// ──────────────────────────────────────────────
// User Update (name / password)
// ──────────────────────────────────────────────
export async function updateUser(email, field, value) {
  if (!['name', 'password'].includes(field)) {
    throw {
      response: { data: { message: 'Only name and password can be updated' } },
    };
  }
  const update =
    field === 'password' ? { password: simpleHash(value) } : { [field]: value };
  const result = updateUserField(email, update);
  if (!result) {
    throw { response: { data: { message: 'Failed to update ' + field } } };
  }
  return {
    status: 200,
    data: { message: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully` },
  };
}

// ──────────────────────────────────────────────
// Skill Analyzer (client-side keyword matching)
// ──────────────────────────────────────────────
const COMMON_SKILLS = [
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'ruby', 'php',
  'go', 'rust', 'swift', 'kotlin', 'react', 'angular', 'vue', 'node',
  'express', 'django', 'flask', 'laravel', 'spring boot', 'html', 'css',
  'sass', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
  'firebase', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git',
  'github', 'jenkins', 'ci/cd', 'machine learning', 'deep learning', 'nlp',
  'computer vision', 'data analysis', 'pandas', 'numpy', 'scikit-learn',
  'tensorflow', 'pytorch', 'rest api', 'graphql', 'microservices', 'agile',
  'scrum', 'linux', 'bash', 'unit testing', 'jest', 'cypress', 'selenium',
  'figma', 'tableau', 'power bi', 'excel', 'r', 'matlab', 'hadoop',
  'spark', 'kafka', 'elasticsearch', 'terraform', 'ansible',
];

function extractText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

function findSkillsInText(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const skill of COMMON_SKILLS) {
    const pattern = new RegExp('\\b' + skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    if (pattern.test(lower)) {
      found.push(skill.length <= 3 ? skill.toUpperCase() : skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  }
  return found;
}

export async function analyzeSkills(resumeFile, jobDescFile) {
  const [resumeText, jobText] = await Promise.all([
    extractText(resumeFile),
    extractText(jobDescFile),
  ]);

  const skillsFromResume = findSkillsInText(resumeText);
  let skillsRequiredInJob = findSkillsInText(jobText);

  if (skillsRequiredInJob.length === 0) {
    skillsRequiredInJob = ['Python', 'JavaScript', 'SQL', 'Git'];
  }

  const resumeSet = new Set(skillsFromResume.map((s) => s.toLowerCase()));
  const matchingSkills = [];
  const skillsToImprove = [];

  for (const skill of skillsRequiredInJob) {
    if (resumeSet.has(skill.toLowerCase())) {
      matchingSkills.push(skill);
    } else {
      skillsToImprove.push(skill);
    }
  }

  return {
    data: {
      skills_from_resume: skillsFromResume,
      skills_required_in_job: skillsRequiredInJob,
      matching_skills: matchingSkills,
      skills_to_improve: skillsToImprove,
    },
  };
}

// ──────────────────────────────────────────────
// Course Recommendation
// ──────────────────────────────────────────────
export async function recommendCourse(skillName) {
  const query = encodeURIComponent(skillName + ' course');
  const url = `https://www.udemy.com/courses/search/?q=${query}`;
  return { data: { recommendation: url } };
}
