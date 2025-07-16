import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing">
      <div className="hero">
        <h1>BioAI Workspace</h1>
        <p>
          AI-powered platform for bioinformatics research and education.
          Explore molecular structures and run complex analyses using natural language.
        </p>
        <div className="hero-actions">
          <Link to="/auth" className="btn btn-primary">Get Started</Link>
          <button className="btn btn-secondary">Learn More</button>
        </div>
      </div>
      
      <div className="features">
        <div className="feature">
          <h3>Natural Language Interface</h3>
          <p>Ask questions and give commands in plain English</p>
        </div>
        <div className="feature">
          <h3>3D Molecular Visualization</h3>
          <p>Interactive 3D viewer powered by Molstar</p>
        </div>
        <div className="feature">
          <h3>Persistent Sessions</h3>
          <p>Your work is automatically saved and synced</p>
        </div>
      </div>
    </div>
  );
}