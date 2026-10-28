export interface ImpactPillar {
  id: string
  tag: string
  shortLabel: string
  title: string
  description: string
  focusArea: string
}

export const impactPillars: ImpactPillar[] = [
  {
    id: 'education',
    tag: 'Focus Area 01',
    shortLabel: 'Youth & Education',
    title: 'Youth & Education Empowerment',
    description: 'Expanding access to digital literacy, STEM scholarships, and leadership mentorship for underrepresented students.',
    focusArea: 'Digital Literacy & STEM',
  },
  {
    id: 'community',
    tag: 'Focus Area 02',
    shortLabel: 'Urban Revitalization',
    title: 'Urban Revitalization & Community Support',
    description: 'Grassroots programs supporting community health initiatives, urban infrastructure, and sustainable local development.',
    focusArea: 'Community & Health Equity',
  },
  {
    id: 'entrepreneurship',
    tag: 'Focus Area 03',
    shortLabel: 'Enterprise & Equity',
    title: 'Enterprise & Founder Mentorship',
    description: 'Opening global venture networks, capital access, and executive guidance for early-stage diverse entrepreneurs.',
    focusArea: 'Mentorship & Advisory',
  },
]

