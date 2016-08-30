using System;
using SkiaSharp;

namespace FlappyBird
{
    public class WelcomeScreen : ScrollingGroundScreen
    {
        private const float GrassHeight = 22f;

        private readonly Sprite playButton;
        private readonly Sprite scoresButton;
        private readonly Sprite rateButton;
        private readonly Sprite title;
        private readonly Sprite copyright;

        private SKPoint titlePos;
        private SKPoint ratePos;
        private SKPoint playPos;
        private SKPoint scoresPos;

        public WelcomeScreen(Game game, SpriteSheet spriteSheet)
            : base(game, spriteSheet)
        {
            playButton = SpriteSheet.Sprites[FlappyBirdSprites.button_play];
            scoresButton = SpriteSheet.Sprites[FlappyBirdSprites.button_score];
            rateButton = SpriteSheet.Sprites[FlappyBirdSprites.button_rate];
            title = SpriteSheet.Sprites[FlappyBirdSprites.title];
            copyright = SpriteSheet.Sprites[FlappyBirdSprites.brand_copyright];
        }

        public override void Resize(int width, int height)
        {
            base.Resize(width, height);

            // the layout of this screen is:
            //  - the title at eye level at 1/3 the way down the screen
            //  - the ground resting on the bottom
            //  - the big buttons resting on the ground
            //  - the bird is centered in the space above the ground
            //  - the rate button is 2/3 in the space above the ground

            var third = height / 3f;

            // title
            var titleTop = third - title.Size.Height / 2f;
            titlePos = new SKPoint((width - title.Size.Width) / 2f, titleTop);

            // bird
            playerPos = new SKPoint(width / 2f, groundLevel / 2f);

            // rate button
            ratePos = new SKPoint((width - rateButton.Size.Width) / 2f, groundLevel / 1.5f);

            // play + scores buttons
            var buttonSpace = (width - playButton.Size.Width - scoresButton.Size.Width) / 3f;
            playPos = new SKPoint(buttonSpace, groundLevel - playButton.Size.Height + Game.ButtonShadowBorder.Bottom);
            buttonSpace += playButton.Size.Width + buttonSpace;
            scoresPos = new SKPoint(buttonSpace, groundLevel - scoresButton.Size.Height + Game.ButtonShadowBorder.Bottom);
        }

        protected override void DrawForeground(SKCanvas canvas)
        {
            base.DrawForeground(canvas);

            // title
            title.Draw(canvas, titlePos.X, titlePos.Y);

            // rate button
            rateButton.Draw(canvas, ratePos.X, ratePos.Y);

            // play + scores buttons
            playButton.Draw(canvas, playPos.X, playPos.Y);
            scoresButton.Draw(canvas, scoresPos.X, scoresPos.Y);
        }

        public override void Draw(SKCanvas canvas)
        {
            base.Draw(canvas);

            copyright.Draw(canvas, (Game.DisplaySize.Width - copyright.Size.Width) / 2f, groundLevel + GrassHeight);
        }

        public override void Tap(SKPointI point)
        {
            base.Tap(point);

            if (HitTest(point, ratePos, rateButton.Size))
            {
                RatingsTapped?.Invoke(this, EventArgs.Empty);
            }
            else if (HitTest(point, playPos, playButton.Size))
            {
                PlayTapped?.Invoke(this, EventArgs.Empty);
            }
            else if (HitTest(point, scoresPos, scoresButton.Size))
            {
                ScoresTapped?.Invoke(this, EventArgs.Empty);
            }
        }

        public event EventHandler RatingsTapped;

        public event EventHandler PlayTapped;

        public event EventHandler ScoresTapped;
    }
}
