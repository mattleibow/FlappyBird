using System;
using System.Threading.Tasks;
using SkiaSharp;

namespace FlappyBird
{
    public class Game
    {
        public const float ForwardSpeed = 2f / 0.015f;
        public static readonly SKRectI ButtonShadowBorder = new SKRectI(6, 2, 6, 10); // real button size: 104x57; sprite size: 116x70

        private const float FadeSpeed = 0.5f; // seconds

        // game data
        private SpriteSheet spriteSheet;

        // screens
        private Screen currentScreen;
        private Screen transitionScreen;

        // transition
        private float fadeProgress;
        private SKPaint fadePaint;

        public Game()
        {
            spriteSheet = new SpriteSheet("Media/Graphics/atlas.png", "Media/Data/atlas.txt");

            fadePaint = new SKPaint();
            fadePaint.Color = SKColors.Transparent;
        }

        public SKSize DisplaySize { get; private set; }

        public async Task LoadContentAsync()
        {
            await spriteSheet.LoadAsync();

            var welcomeScreen = new WelcomeScreen(this, spriteSheet);
            welcomeScreen.PlayTapped += StartNewGame;

            currentScreen = new GameScreen(this, spriteSheet);
            //currentScreen = welcomeScreen;
        }

        public void Resize(int width, int height)
        {
            DisplaySize = new SKSize(width, height);

            // make sure all the visible screens are resized correctly
            currentScreen?.Resize(width, height);
            transitionScreen?.Resize(width, height);
        }

        public void Update(TimeSpan dt)
        {
            // update the current screen
            currentScreen?.Update(dt);

            // update the fade transition
            if (transitionScreen != null)
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

        public void Start()
        {
            currentScreen?.Start();
        }

        public void Draw(SKCanvas canvas)
        {
            currentScreen?.Draw(canvas);

            // draw the black over the screen
            if (transitionScreen != null)
            {
                fadePaint.Color = SKColors.Black.WithAlpha((byte)(fadeProgress * byte.MaxValue));
                canvas.DrawRect(SKRect.Create(DisplaySize.Width, DisplaySize.Height), fadePaint);
            }
        }

        public void Tap(SKPointI point)
        {
            // interaction only when not transitioning
            if (transitionScreen == null)
            {
                currentScreen?.Tap(point);
            }
        }

        private void StartNewGame(object sender, EventArgs e)
        {
            var screen = new GameScreen(this, spriteSheet);
            //screen.PlayTapped += StartNewGame;

            fadeProgress = 0;
            transitionScreen = screen;
        }
    }
}
