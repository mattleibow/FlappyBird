using System;
using SkiaSharp;

using FlappyBird.GameEngine;
using FlappyBird.Sprites;

namespace FlappyBird
{
    public class TutorialOverlay : Overlay
    {
        private const float TutorialFadeDuration = 0.5f;
        private static InterperlatorDelegate TutorialFadeInterpolator = Animator.Interpolations.Linear;

        private readonly Sprite tutorial;
        private readonly Sprite getReady;

        private readonly Animator fadeAnimator;

        private SKPoint readyPos;
        private SKPoint tutorialPos;
        private byte alpha;

        public TutorialOverlay(Game game, SpriteSheet spriteSheet)
            : base(game, spriteSheet)
        {
            tutorial = SpriteSheet.Sprites[FlappyBirdSprites.tutorial];
            getReady = SpriteSheet.Sprites[FlappyBirdSprites.text_ready];

            fadeAnimator = new Animator();
        }

        public override void Show()
        {
            base.Show();

            fadeAnimator.Start(0f, 1f, TutorialFadeInterpolator, TutorialFadeDuration);

            Finished = false;
            Visible = true;
        }

        public override void Hide()
        {
            base.Hide();

            fadeAnimator.Start(1f, 0f, TutorialFadeInterpolator, TutorialFadeDuration);

            Finished = false;
        }

        public override void Resize(int width, int height)
        {
            base.Resize(width, height);

            readyPos = new SKPoint((width - getReady.Size.Width) / 2f, (height / 3f) - (getReady.Size.Height / 2f));
            tutorialPos = new SKPoint((width - tutorial.Size.Width) / 2f, (height - tutorial.Size.Height) / 2f);
        }

        public override void Update(TimeSpan dt)
        {
            base.Update(dt);

            fadeAnimator.Update(dt);

            if (fadeAnimator.Finished)
            {
                Finished = true;
                if (fadeAnimator.Value == 0f)
                {
                    Visible = false;
                }
            }
        }

        public override void Draw(SKCanvas canvas)
        {
            base.Draw(canvas);

            if (Visible)
            {
                alpha = (byte)(fadeAnimator.Value * 255);
                getReady.Draw(canvas, readyPos.X, readyPos.Y, alpha);
                tutorial.Draw(canvas, tutorialPos.X, tutorialPos.Y, alpha);
            }
        }
    }
}
