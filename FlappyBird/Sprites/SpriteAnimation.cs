using System;

namespace FlappyBird.Sprites
{
    public class SpriteAnimation
    {
        private int currentFrame;
        private float progress;

        public SpriteAnimation(params Sprite[] frames)
        {
            Frames = frames;
        }

        public Sprite[] Frames { get; private set; }

        public float Speed { get; set; } // f/s

        public bool Enabled { get; set; }

        public bool Looping { get; set; }

        public int CurrentFrame
        {
            get { return currentFrame; }
            set
            {
                currentFrame = value % Frames.Length;
                progress = currentFrame / Speed;
            }
        }

        public void Update(TimeSpan dt)
        {
            if (Enabled)
            {
                progress += (float)dt.TotalSeconds;
                var frame = (int)(progress * Speed);
                if (frame >= Frames.Length && !Looping)
                {
                    frame = Frames.Length - 1;
                    progress = 0;
                    Enabled = false;
                }
                currentFrame = frame % Frames.Length;
            }
        }
    }
}
