import { Redirect } from 'expo-router';

/**
 * Widget Deep Link Entry Point
 *
 * This route exists solely as the target for the Android home screen widget.
 * The widget launches `gymtracker:///start-workout`, which Expo Router routes here.
 * This component immediately redirects to the workout home screen (/(tabs)/).
 *
 * URL: gymtracker:///start-workout
 */
export default function StartWorkout() {
  return <Redirect href="/(tabs)/" />;
}
