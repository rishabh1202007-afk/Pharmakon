import { Link } from 'react-router-dom';
import heroImage from '../assets/dna-hero.jpg';
import devyanshPic from '../assets/devyansh pic.jpeg';
import devangPic from '../assets/devang pic.jpeg';
import shuklaPic from '../assets/shukla pic.jpeg';
import bhavyaPic from '../assets/bhavya pic.jpeg';
import riddimaPic from '../assets/riddima pic.jpeg';
import riyaPic from '../assets/riya pic.jpeg';
import anshPic from '../assets/Ansh pic.jpeg';
import arpitPic from '../assets/Arpit pic.jpeg';
import lakshayPic from '../assets/lakshay pic.jpeg';
import bhandaraPic from '../assets/bhandara pic.jpeg';

const teamMembers = [
  {
    name: 'Riya',
    role: 'AIML Engineer',
    bio: 'A passionate contributor dedicated to improving healthcare accessibility through innovation.',
    photo: riyaPic,
    photoPosition: 'center 25%',
  },
  {
    name: 'Devyansh Verma ',
    role: 'Full-Stack Engineer',
     bio: 'Brings a strong blend of technical expertise and problem-solving mindset to the team.',
    photo: devyanshPic,
    photoPosition: 'center',
  },
  {
    name: 'Riddima Singh',
    role: 'Full-Stack Engineer',
    bio: 'Committed to delivering reliable and efficient solutions in the pharmaceutical domain.',
    photo: riddimaPic,
    photoPosition: 'center',
  },
  {
    name: 'Devang Kumar Bharti',
    role: 'Full-Stack Engineer',
    bio: 'Plays a key role in ensuring seamless collaboration and project execution.',
    photo: devangPic,
    photoPosition: 'center',
  },
  {
    name: 'Shikhar Shukla',
    role: 'Data Scientist',
    bio: 'Driven by a vision to make healthcare smarter, faster, and more accessible.',
    photo: shuklaPic,
    photoPosition: 'center 25%',
  },
  {
    name: 'Shikhar Bhandari',
    role: 'AIML Engineer',
    bio: 'Focuses on building user-centric solutions with precision and attention to detail.',
    photo: bhandaraPic,
    photoPosition: 'center 25%',
  },
  {
    name: 'Lakshay Goyal',
    role: 'Data Scientist',
    bio: 'A team player who values creativity, responsibility, and innovation.',
    photo: lakshayPic,
    photoPosition: 'center',
  },
  {
    name: 'Ansh Goyal',
    role: 'IOT Engineer',
    bio: 'Actively contributes to research, development, and continuous improvement.',
    photo: anshPic,
    photoPosition: 'center',
  },
  {
    name: 'Arpit Kumar',
    role: 'Data Scientist',
    bio: 'Works towards maintaining high standards of quality and integrity in every task.',
    photo: arpitPic,
    photoPosition: 'center',
  },
  {
    name: 'Bhavya Chitransh',
    role: 'Data Scientist',
    bio: 'Dedicated to leveraging technology for meaningful impact in the healthcare industry.',
    photo: bhavyaPic,
    photoPosition: 'center 25%',
  },
];

export function AboutPage() {
  return (
    <main className="page about-page">
      <header className="about-header fade-in">
        <Link to="/" className="back-link">
          ← Back to home
        </Link>
        <h1>About PharmaKon</h1>
        <p>
          PharmaKon grew from a collaboration between clinicians, geneticists, and engineers who shared a single goal:
          make pharmacogenomics explainable, deterministic, and practical for every clinical decision.
        </p>
      </header>

      <section className="about-story fade-in">
        <div className="story-text">
          <h2>Our story</h2>
          <p>
            We built PharmaKon to decode how genetic variants influence medication response and then show the reasoning
            behind every recommendation. We combine curated literature, deterministic logic, and a human-centered design
            so teams can quickly act on genomic insights instead of getting lost in black-box predictions.
          </p>
          <p>
            Every outcome is traceable—clinicians can see which variant triggered a change, why the dosage shifted, and
            how confident the platform is in each assertion. That transparency keeps the focus on patient safety.
          </p>
        </div>
        <div className="story-visual">
          <img src={heroImage} alt="DNA strands overlaid with interface callouts" />
        </div>
      </section>

      <section className="team-section fade-in">
        <h2>Meet the team</h2>
        <div className="team-grid">
          {teamMembers.map((member) => (
            <article className="team-card" key={member.name}>
              <div
                className="team-card__photo"
                style={{
                  backgroundImage: `url(${member.photo})`,
                  backgroundPosition: member.photoPosition,
                }}
                aria-hidden="true"
              />
              <div className="team-card__info">
                <h3>{member.name}</h3>
                <p className="team-card__role">{member.role}</p>
                <p>{member.bio}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
