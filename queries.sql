CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    subscription_id TEXT UNIQUE,  -- Nullable for free trials
    plan_type TEXT CHECK (plan_type IN ('monthly', 'annual', 'trial')),
    -- status TEXT CHECK (status IN ('active', 'canceled', 'trialing', 'expired')),
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE topics ( -- Store all topics
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL,
    completed NUMERIC(7,6) DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('short', 'long', 'mcq', 'multi_correct', 'numerical')),
    question TEXT NOT NULL,
    options TEXT[], -- Nullable for types other than msc and multi-correct
    steps TEXT[], -- Nullable for types other than numerical
    answer TEXT,
    answers TEXT[]
);

