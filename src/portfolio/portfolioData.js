// Single source of truth for the island. Every value here is taken from the
// original portfolio (public/classic/index.html). Edit here, not in the 3D code.

export const profile = {
  name: 'Vaibhav Pokhriyal',
  firstName: 'Vaibhav',
  title: 'AI/ML Engineer',
  focus: ['Agentic AI', 'Computer Vision'],
  summary:
    "AI/ML Engineer focused on agentic AI and computer vision. Built a multilingual voice AI support agent with LangGraph and MCP at Mind Masters AI, and researched graph-neural-network seizure detection from EEG at IIT Delhi's Neuro Computing Lab. I build end-to-end systems, from model to deployment.",
  status: 'Available for opportunities',
  openTo: 'Open to research collaborations, full-time roles, and freelance AI/ML projects.',
  avatar: 'assets/vaibhav.jpg',
  resume: 'https://drive.google.com/file/d/1hh5mV3ckq6Igy_VanLb_9jrdtEf6vn1H/view?usp=sharing',
};

export const education = [
  {
    institution: 'GBPIET',
    location: 'Pauri Garhwal, Uttarakhand',
    degree: 'B.Tech CSE (AI & ML)',
    fullDegree: 'B.Tech Computer Science & Engineering (Artificial Intelligence & Machine Learning)',
    period: '2024–2028',
    image: 'assets/gbpiet.jpg',
  },
];

export const experience = [
  {
    id: 'mindmasters',
    role: 'AI/ML Intern',
    org: 'Mind Masters AI Solutions Pvt. Ltd.',
    short: 'Mind Masters AI',
    logo: 'assets/mindmasters.png',
    logoDark: true,
    unit: 'Voice AI & Customer Support',
    mode: 'Remote',
    period: 'June 2026 – September 2026',
    points: [
      'Developed an end-to-end multilingual AI voice customer-support agent integrating agentic workflows, STT, TTS, telephony, and IVR for real-time customer interactions.',
      'Designed modular agent workflows using LangGraph and MCP, integrating business tools, conversation state management, and contextual response generation for travel-support operations.',
      'Implemented FastAPI, PostgreSQL, WebSockets, and real-time CRM integration for persistent conversation history, live transcripts, call states, resolution tracking, and customer feedback.',
      'Integrated telephony workflows including call lifecycle management, language selection, caller and booking verification, voice interaction, and DTMF-based customer feedback.',
      'Contributed to AI-powered customer support chatbots, enquiry automation, and integration of AI services with company and booking platforms.',
    ],
    tags: ['LangGraph', 'MCP', 'AI Agents', 'STT', 'TTS', 'Telephony', 'IVR', 'FastAPI', 'PostgreSQL', 'WebSockets', 'CRM Integration', 'Python'],
    links: [
      { label: 'Internship certificate', url: 'https://drive.google.com/file/d/1CU7ZhHyQDsboyrDEhAmH9KRJsiGdyuv5/view?usp=sharing' },
      { label: 'Voice support demo', url: 'https://lnkd.in/p/gbeV64KH' },
      { label: 'AI cold-calling demo', url: 'https://lnkd.in/p/g6kd8w9V' },
      { label: 'Voice agent repo', url: 'https://github.com/vaibhav668/voice-based-customer-care-agent.git' },
      { label: 'Cold-calling repo', url: 'https://github.com/vaibhav668/demo_cold_calling.git' },
    ],
  },
  {
    id: 'iitd',
    role: 'Research Intern',
    org: 'Indian Institute of Technology, Delhi',
    short: 'IIT Delhi',
    unit: 'Neuro Computing Lab',
    mode: 'Hybrid',
    period: '12 Feb 2026 – 12 May 2026',
    logo: 'assets/iit.jpg',
    mentor: 'Prof. Tapan K. Gandhi (FNAE, FNASc)',
    points: [
      'Conducted research on AI-driven healthcare applications under the guidance of Prof. Tapan K. Gandhi (FNAE, FNASc).',
      'Designed and implemented a Hybrid Graph Attention Network (GAT) + BiLSTM framework for EEG-based epileptic seizure detection using the CHB-MIT dataset.',
      'Developed an end-to-end research pipeline: EEG signal preprocessing, graph construction, feature engineering, temporal sequence modeling, and performance evaluation.',
      'Leveraged Deep Learning, Graph Neural Networks, and Biomedical Signal Processing to build a robust seizure detection system.',
      'Implemented Pearson-correlation graph connectivity and focal-loss optimization with patient-wise evaluation for seizure classification under highly imbalanced EEG data.',
      'Achieved 84% test accuracy, 0.82 Macro F1-score, 0.78 seizure recall, and 0.914 ROC-AUC.',
      'Explored CNN-based EEG scalogram classification using AlexNet for comparative spatiotemporal seizure detection analysis.',
    ],
    tags: ['PyTorch', 'Deep Learning', 'Biomedical Signal Processing', 'EEG Signal Processing', 'Graph Neural Networks', 'PyTorch Geometric', 'CNN', 'BiLSTM', 'Transfer Learning', 'Model Evaluation', 'Seizure Detection', 'Focal Loss', 'AlexNet', 'Python', 'AI in Healthcare', 'CHB-MIT Dataset'],
    links: [
      { label: 'Internship certificate', url: 'https://drive.google.com/file/d/1yTkQkINH278gIJHyy7UGoCnLWOIMXt0E/view' },
      { label: 'Project repository', url: 'https://github.com/vaibhav668/Hybrid-Spatiotemporal-Graph-Neural-Network-Framework-for-EEG-Based-Epileptic-Seizure-Detection' },
    ],
  },
];

const li = (slug) => `https://www.linkedin.com/posts/vaibhav-pokhriyal-a8b08023a_${slug}`;

export const projects = [
  {
    id: 'netravaani',
    name: 'NetraVaani',
    image: 'assets/projects/netravaani.jpg',
    tagline: 'Bio-signal communication for patients',
    fullName: 'NetraVaani: Assistive Bio-Signal Communication & Clinical Response Platform',
    context: "SAARTHI '26, 38-hour national-level hackathon, Graphic Era University",
    award: "Most Innovative Idea Award, SAARTHI '26 (≈1,000 registered teams)",
    description:
      'An assistive healthcare platform that lets non-verbal and severely motor-impaired patients communicate clinical needs through forehead EOG eye-blinks and wrist EMG gestures.',
    features: [
      'NPG Lite biosensing hardware with ESP32 gateways recognizes calibrated physiological gestures and turns them into patient care requests',
      'Real-time clinical response workflow with bedside audio verification, nurse-station alerts, and closed-loop assistance resolution',
      'Patient handshake verification, request confirmation and cancellation, emergency alarm bypass, and patient-confirmed care resolution',
      'Nurse clinical command center with real-time SSE alerts, patient registry, device allocation, and care request tracking',
      'Next.js dashboard with an Express.js + MongoDB backend, JWT authentication, and role-based access control',
      'Device registration, telemetry monitoring, patient-device allocation, and real-time biosignal communication',
    ],
    tech: ['ESP32', 'NPG Lite', 'EOG', 'EMG', 'Node.js', 'Express.js', 'MongoDB', 'Next.js', 'React', 'TypeScript', 'SSE'],
  },
  {
    id: 'leopard',
    name: 'Leopard Alert System',
    image: 'assets/projects/leopard.jpg',
    imageAspect: 1900 / 1187, // full screenshot, not cropped to the usual 16:8 banner
    tagline: 'AI-powered campus wildlife surveillance',
    fullName: 'Leopard Detection & Campus Alert System',
    context: 'GBPIET, built with first-year robotics club members',
    description:
      'An AI-powered leopard detection and campus alert prototype to improve wildlife safety on a forest-adjacent college campus.',
    features: [
      'Fine-tuned YOLOv8n through dataset preparation, augmentation, training, and optimization on reference leopard surveillance footage',
      'Confirmation rule requiring a detection in 10 of 15 frames to reduce false alarms',
      'Camera pipeline for configurable video and RTSP sources: detection, ByteTrack tracking, confirmation, and evidence generation',
      'FastAPI + SQLite persistence for confirmed sightings, camera records, and detection events',
      'Bounding-box snapshots, annotated video clips, and configurable Telegram alerts with sighting information',
      'Dashboard with live camera previews, detection records, and activity-pattern visualization for campus security',
      'Led first-year robotics club members across dataset preparation, model integration, frontend, backend, data analysis, and Telegram bot integration',
    ],
    tech: ['Python', 'YOLOv8n', 'OpenCV', 'ByteTrack', 'FastAPI', 'SQLite', 'Streamlit', 'Plotly', 'Telegram Bot API', 'RTSP'],
    github: 'https://github.com/vaibhav668/CampusAlertSystem',
    demo: 'https://lnkd.in/p/gs3xeJbk',
  },
  {
    id: 'intelliguard',
    name: 'IntelliGuard AI',
    tagline: 'Real-time intelligent surveillance',
    image: 'assets/projects/intelliguard.jpg',
    description:
      'An end-to-end intelligent surveillance system using Computer Vision and Deep Learning for real-time accident detection, violence recognition, fire & smoke monitoring, and vehicle tracking.',
    features: [
      'Processes live video streams and generates actionable safety alerts',
      'Accident, violence, fire & smoke detection plus vehicle tracking',
      'Scalable deployment with FastAPI, Docker and Streamlit',
      'Custom fine-tuned YOLOv8n for fire & smoke, and a ResNet18 transfer-learning model with temporal buffering for fight detection',
      'Multi-object tracking, vehicle speed estimation, and IoU-based collision logic for accident analysis',
    ],
    tech: ['YOLOv8', 'OpenCV', 'PyTorch', 'FastAPI', 'Streamlit', 'ResNet18', 'Docker'],
    github: 'https://github.com/vaibhav668/INTELLIGUARD-AI.git',
    demo: li('computervision-ai-deeplearning-activity-7455938447854460929-rAtc'),
  },
  {
    id: 'neurograph',
    name: 'NeuroGraph AI',
    tagline: 'Seizure detection from EEG graphs',
    image: 'assets/projects/neurograph.jpg',
    description:
      'A novel Hybrid Graph Attention Network (GAT) + BiLSTM framework for automated epileptic seizure detection using EEG signals from the CHB-MIT dataset.',
    features: [
      'EEG preprocessing, graph-based representation learning and temporal modeling',
      'Patient-wise evaluation',
      'Test ROC-AUC of 0.914 and 84% classification accuracy',
    ],
    tech: ['PyTorch Geometric', 'GAT', 'BiLSTM', 'MNE', 'EEG', 'PyTorch', 'Graph Neural Networks'],
    github: 'https://github.com/vaibhav668/Hybrid-Spatiotemporal-Graph-Neural-Network-Framework-for-EEG-Based-Epileptic-Seizure-Detection.git',
    demo: li('iitdelhi-researchinternship-graphneuralnetworks-activity-7462394235045036032-ubOF'),
  },
  {
    id: 'yt-copilot',
    name: 'YouTube AI Copilot',
    tagline: 'Chat with any YouTube video',
    image: 'assets/projects/yt-copilot.jpg',
    description:
      'An AI-powered Chrome extension that lets users interact with YouTube videos through natural language conversations.',
    features: [
      'RAG pipeline that extracts transcripts automatically',
      'Semantic search with FAISS vector databases',
      'Contextual answers and summaries from Large Language Models',
      'Qwen2.5-7B-Instruct with all-MiniLM-L6-v2 sentence-transformer embeddings',
      'Lightweight HTML/CSS/JavaScript extension UI with real-time backend communication',
    ],
    tech: ['LangChain', 'FAISS', 'FastAPI', 'HuggingFace', 'RAG', 'Qwen Model', 'YoutubeTranscriptApi'],
    github: 'https://github.com/vaibhav668/YT_AI_ASSISTANT_EXTENSION.git',
    demo: li('generativeai-rag-langchain-activity-7463825368970473472-Eduf'),
  },
  {
    id: 'visioncontrol',
    name: 'VisionControl AI',
    tagline: 'Play Subway Surfers with your body',
    image: 'assets/projects/visioncontrol.jpg',
    description:
      'A gesture control system that turns real-time body movements into game commands for Subway Surfers.',
    features: [
      'Pose estimation and motion tracking',
      'Recognizes dynamic gestures and maps them to gameplay actions',
      'Vision-based human-computer interaction',
    ],
    tech: ['OpenCV', 'MediaPipe', 'Python', 'Pose Estimation', 'PyAutoGUI'],
    github: 'https://github.com/vaibhav668/Subway-Surfer-Handless-Version.git',
    demo: li('ai-computervision-accessibility-activity-7427394046068789248-VPNs'),
  },
  {
    id: 'bert',
    name: 'BERT Resume Intelligence',
    tagline: 'Career role classification',
    fullName: 'BERT-Powered Resume Intelligence & Career Role Classification',
    image: 'assets/projects/bert.jpg',
    description:
      'A recruitment intelligence system that classifies resumes into relevant job roles using fine-tuned BERT transformers.',
    features: [
      'End-to-end NLP pipeline for resume parsing and semantic understanding',
      'Multi-class role prediction across 25+ career categories',
      'Scalable, accurate candidate screening',
      'Evaluated with confusion matrix, precision, recall, and weighted F1-score to analyse role-wise misclassifications',
    ],
    tech: ['BERT', 'PyTorch', 'Transformers', 'NLP', 'Scikit-Learn', 'Hugging Face', 'PyPDFLoader'],
    github: 'https://github.com/vaibhav668/bert-resume-role-classifier.git',
    demo: li('machinelearning-nlp-bert-activity-7421876950488637440-cMVu'),
  },
  {
    id: 'airsketch',
    name: 'AirSketch AI',
    tagline: 'Draw in the air with your hand',
    image: 'assets/projects/airsketch.jpg',
    description:
      'A virtual drawing interface that uses real-time hand tracking and gesture recognition for touchless sketching.',
    features: [
      'Detects finger positions in real time',
      'Pinch gestures trigger drawing actions',
      'Canvas controlled entirely by natural hand movement',
    ],
    tech: ['OpenCV', 'MediaPipe', 'Python', 'Computer Vision', 'Gesture Recognition'],
    github: 'https://github.com/vaibhav668/SketchWithOpencvCv.git',
    demo: li('computervision-gesturerecognition-humancomputerinteraction-activity-7425880616254185473-W2U0'),
  },
];

export const skills = [
  { category: 'Programming Languages', items: ['Python', 'C++', 'JavaScript', 'SQL'] },
  { category: 'Generative & Agentic AI', items: ['LangChain', 'LangGraph', 'Model Context Protocol (MCP)', 'Agentic AI', 'Agentic Workflows', 'Retrieval-Augmented Generation (RAG)', 'Generative AI', 'Vector Databases', 'Hugging Face Transformers'] },
  { category: 'Machine Learning & Deep Learning', items: ['PyTorch', 'PyTorch Geometric', 'Scikit-learn', 'TensorFlow', 'Deep Learning', 'Machine Learning', 'Transfer Learning', 'CNNs', 'LSTMs', 'Transformers', 'BERT', 'Graph Neural Networks (GNNs)', 'Natural Language Processing (NLP)'] },
  { category: 'Computer Vision', items: ['YOLOv8', 'OpenCV', 'ByteTrack', 'MediaPipe', 'Multi-Object Tracking', 'Image Processing', 'Face Tracking'] },
  { category: 'Backend & Web Development', items: ['FastAPI', 'Node.js', 'Express.js', 'Django', 'REST APIs', 'WebSockets', 'PostgreSQL', 'MongoDB', 'SQLite'] },
  { category: 'Data Science & Signal Processing', items: ['NumPy', 'Pandas', 'Matplotlib', 'Seaborn', 'MNE', 'EEG Signal Processing', 'Graph Theory'] },
  { category: 'Tools & Deployment', items: ['Docker', 'Git', 'GitHub', 'Render', 'Vercel', 'Streamlit', 'Jupyter Notebook', 'Google Colab'] },
  { category: 'Core CS', items: ['Data Structures & Algorithms', 'Object-Oriented Programming (OOP)', 'Problem Solving'] },
];

export const achievements = [
  {
    id: 'saarthi',
    title: 'Most Innovative Idea',
    image: 'assets/saarthi/award-ceremony.jpg',
    imageFocus: '38% center',
    galleries: [{
      title: "SAARTHI '26, Graphic Era Hill University: award ceremony, the team with EOG/EMG electrodes, and a live NetraVaani demo",
      landscape: true,
      photos: [
        { src: 'assets/saarthi/award-ceremony.jpg', wide: true, alt: "Vaibhav and teammates holding their certificates with the organiser on stage at the SAARTHI '26 hackathon" },
        { src: 'assets/saarthi/team-biosensors.jpg', alt: 'The NetraVaani team wearing their hackathon T-shirts, with EOG and EMG electrodes attached to a teammate' },
        { src: 'assets/saarthi/netravaani-demo.jpg', alt: "Vaibhav placing an EOG electrode on a teammate's forehead at the NetraVaani desk" },
      ],
    }],
    place: 'Most Innovative Idea Award',
    rank: 1,
    event: "SAARTHI '26, Graphic Era University",
    description:
      'Recognized for NetraVaani, an assistive bio-signal communication and clinical response platform, built during a 38-hour national-level hackathon with approximately 1,000 registered teams.',
    detail:
      'Patients communicate through EOG eye-blinks and EMG gestures captured by NPG Lite + ESP32 hardware, with a real-time nurse command center closing the loop.',
  },
  {
    id: 'nano',
    title: 'Nano Navigator',
    place: '3rd place',
    rank: 3,
    event: "Cognizance 2026, IIT Roorkee",
    image: 'assets/achievements/nano.jpg',
    description:
      'Secured 3rd position at Cognizance 2026, IIT Roorkee as part of Team Prasthanam. Designed and developed an autonomous Micromouse robot that navigates and solves complex wall mazes using the Flood Fill path-planning algorithm and Left-Hand Rule navigation.',
    detail:
      'Built the complete hardware: ESP32, Time-of-Flight sensors, TB6612FNG motor driver, N20 motors, and a 2S LiPo-powered buck-boost architecture. Overcame significant challenges in sensor calibration and motion control.',
  },
  {
    id: 'blindbot',
    title: 'BlindBot Battle',
    place: '2nd place',
    rank: 2,
    event: "Tryst 2025, IIT Delhi",
    image: 'assets/achievements/blindbot.jpg',
    description:
      'Secured 2nd position in the BlindBot Battle Robo Soccer competition at Tryst 2025, IIT Delhi, as part of a student robotics team. Designed, built, and tested autonomous soccer robots.',
    detail:
      'Hands-on experience in embedded systems, wireless control, sensor integration, and robotic navigation, achieved as a first-year engineering student.',
  },
];

export const positions = [
  {
    role: 'Web Master',
    org: 'IEEE Student Branch, GBPIET',
    points: [
      'Manage the branch website and technical content.',
      'Coordinated the development of the modern IEEE Student Branch GBPIET website.',
    ],
    subsections: [{
      title: 'IEEE Day 2026: event coordination',
      points: [
        'Coordinated and organized eight technical events as part of IEEE Day 2026 celebrations at GBPIET.',
        'Conducted a two-hour hands-on workshop on Retrieval-Augmented Generation (RAG)-based chatbot development, introducing participants to practical Generative AI workflows.',
        'Served as a judge for the OpenCV Filter Showcase, evaluating participant projects and technical implementations.',
        'Coordinated event execution, participant engagement, and technical activities across the IEEE Day program.',
      ],
      galleries: [{
        title: 'Hands-on workshop: building a RAG-based chatbot',
        photos: [
          { src: 'assets/ieee/rag-workshop-1.jpg', alt: 'Vaibhav presenting at the podium during the RAG chatbot workshop' },
          { src: 'assets/ieee/rag-workshop-2.jpg', alt: 'Vaibhav explaining retrieve, augment, generate on a slide titled RAG turns it into an open-book exam' },
          { src: 'assets/ieee/rag-workshop-3.jpg', alt: 'Group photo of the IEEE Student Branch team after the workshop' },
          { src: 'assets/ieee/rag-workshop-4.jpg', alt: 'Participants following along on their laptops in the lecture hall' },
        ],
      }, {
        title: 'Judging the OpenCV Filter Showcase',
        photos: [
          { src: 'assets/ieee/opencv-showcase.jpg', alt: 'Vaibhav, in an IEEE Web Master shirt, in front of the projected OpenCV Showcase poster' },
        ],
      }],
    }],
  },
  {
    role: 'Vice President',
    org: 'Prasthanam, Robotics Club, GBPIET',
    galleries: [{
      title: 'Workshops with Prasthanam: introductory session, drone build, Tinkercad simulation',
      photos: [
        { src: 'assets/prasthanam/intro-workshop.jpg', wide: true, alt: 'Vaibhav addressing students at the Prasthanam introductory workshop' },
        { src: 'assets/prasthanam/drone-workshop.jpg', alt: 'Vaibhav wiring a quadcopter frame with students during the drone workshop' },
        { src: 'assets/prasthanam/tinkercad-workshop.jpg', focus: 'left center', alt: 'Tinkercad workshop: students on laptops and Vaibhav demonstrating an Arduino ultrasonic sensor circuit' },
      ],
    }],
    points: [
      'Mentored and coordinated junior team members in collaborative AI/ML and robotics projects, including the leopard detection and campus alert system.',
      'Organized and conducted workshops on Computer Vision, Hardware Control Systems, Home Automation, Git and GitHub, Tinkercad Simulation, and Drone Development.',
      'Mentored junior teams for IIT Roorkee Cognizance technical competitions, supporting robotics design, implementation, and competition preparation.',
    ],
  },
  {
    role: 'Google Gemini Student Ambassador',
    org: 'Google',
    galleries: [{
      title: 'Google Student Ambassador session with first-year CSE students',
      photos: [
        { src: 'assets/gemini/session-1.jpg', focus: 'center 65%', alt: 'Vaibhav standing among first-year students in a classroom during a Google Student Ambassador session' },
        { src: 'assets/gemini/session-2.jpg', alt: 'Vaibhav, back to the camera in a Google Student Ambassador T-shirt, talking with students' },
      ],
    }],
    points: [
      'Promoted AI education and community engagement initiatives.',
      'Participated in workshops, outreach activities, and AI learning programs.',
    ],
  },
];

export const contact = [
  { id: 'email', label: 'Email', value: 'vpokhriyal35@gmail.com', url: 'mailto:vpokhriyal35@gmail.com' },
  { id: 'linkedin', label: 'LinkedIn', value: 'linkedin.com/in/vaibhav-pokhriyal-a8b08023a', url: 'https://www.linkedin.com/in/vaibhav-pokhriyal-a8b08023a/' },
  { id: 'github', label: 'GitHub', value: 'github.com/vaibhav668', url: 'https://github.com/vaibhav668' },
  { id: 'phone', label: 'Phone', value: '+91 82668 94170', url: 'tel:+918266894170' },
  { id: 'resume', label: 'Resume', value: 'Download (Google Drive)', url: profile.resume },
];
