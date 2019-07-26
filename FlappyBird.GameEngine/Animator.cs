using System;

namespace FlappyBird.GameEngine
{
	public delegate double InterperlatorDelegate(double progress);

	public class Animator
	{
		public static class Interpolations
		{
			public static readonly InterperlatorDelegate Linear = new InterperlatorDelegate(x => x);
			public static readonly InterperlatorDelegate Accelerate = new InterperlatorDelegate(x => x * x * x * x);
			public static readonly InterperlatorDelegate Decelerate = new InterperlatorDelegate(x =>
			{
				--x;
				return x * (x * x * x * x) + 1.0;
			});
		}

		private double progress;
		private double difference;
		private double stepSize;
		private double startValue;
		private double endValue;
		private InterperlatorDelegate interpolator;
		private float duration;

		public Animator()
		{
			interpolator = Interpolations.Linear;
			Finished = true;
		}

		public bool Finished { get; private set; }

		public double Value { get; private set; }

		public void Update(TimeSpan dt)
		{
			if (Finished)
				return;

			progress += dt.TotalSeconds;
			Value = interpolator(progress * stepSize) * difference + startValue;
			if (progress >= duration)
			{
				Value = endValue;
				Finished = true;
			}
		}

		public void Start(double start, double end, InterperlatorDelegate interpolator, float duration)
		{
			this.interpolator = interpolator;
			this.duration = Math.Max(0f, duration);

			startValue = start;
			endValue = end;

			Finished = false;
			Value = startValue;

			difference = endValue - startValue;
			progress = 0d;
			stepSize = 1d / this.duration;
		}
	}
}
