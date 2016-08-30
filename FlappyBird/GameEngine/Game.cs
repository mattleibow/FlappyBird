using System;
using System.Threading.Tasks;
using SkiaSharp;

namespace FlappyBird.GameEngine
{
    public abstract class Game
    {
        private const float FadeSpeed = 0.5f; // seconds

        // screens
        private Screen currentScreen;
        private Screen transitionScreen;

        // transition
        private float fadeProgress;
        private SKPaint fadePaint;

        public Game()
        {
            fadePaint = new SKPaint();
            fadePaint.Color = SKColors.Transparent;
        }

        public SKSize DisplaySize { get; private set; }

        public bool Transitioning => transitionScreen != null;

        public Screen CurrentScreen
        {
            get { return currentScreen; }
            set { currentScreen = value; }
        }

        public Screen TransitionScreen => transitionScreen;

        protected void TransisionTo(Screen screen)
        {
            transitionScreen = screen;

            fadeProgress = 0;
            transitionScreen = screen;
        }

        public virtual Task LoadContentAsync()
        {
            return Task.FromResult(true);
        }

        public virtual void Resize(int width, int height)
        {
            DisplaySize = new SKSize(width, height);

            // make sure all the visible screens are resized correctly
            currentScreen?.Resize(width, height);
            transitionScreen?.Resize(width, height);
        }

        public virtual void Update(TimeSpan dt)
        {
            // update the current screen
            currentScreen?.Update(dt);

            // update the fade transition
            if (Transitioning)
            {
                var step = (float)dt.TotalSeconds / FadeSpeed;
                if (currentScreen != transitionScreen && currentScreen != null)
                {
                    // fade to black
                    fadeProgress += step;
                    if (fadeProgress >= 1)
                    {
                        fadeProgress = 1;
                        currentScreen = transitionScreen;
                        transitionScreen.Resize((int)DisplaySize.Width, (int)DisplaySize.Height);
                        transitionScreen.Start();
                    }
                }
                else
                {
                    // fade next screen in
                    fadeProgress -= step;
                    if (fadeProgress <= 0)
                    {
                        transitionScreen = null;
                    }
                }
            }
        }

        public virtual void Start()
        {
            currentScreen?.Start();
        }

        public virtual void Draw(SKCanvas canvas)
        {
            currentScreen?.Draw(canvas);

            // draw the black over the screen
            if (Transitioning)
            {
                fadePaint.Color = SKColors.Black.WithAlpha((byte)(fadeProgress * byte.MaxValue));
                canvas.DrawRect(SKRect.Create(DisplaySize.Width, DisplaySize.Height), fadePaint);
            }
        }

        public virtual void Tap(SKPointI point)
        {
            // interaction only when not transitioning
            if (!Transitioning)
            {
                currentScreen?.Tap(point);
            }
        }

        public virtual void TouchDown(SKPointI point)
        {
            // interaction only when not transitioning
            if (!Transitioning)
            {
                currentScreen?.TouchDown(point);
            }
        }

        public virtual void TouchUp(SKPointI point)
        {
            // interaction only when not transitioning
            if (!Transitioning)
            {
                currentScreen?.TouchUp(point);
            }
        }
    }
}
