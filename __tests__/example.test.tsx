import React from 'react';
import { View, Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Simple Component for Testing
const SimpleComponent = () => (
  <View>
    <Text testID="greeting">Hello, TreNote!</Text>
  </View>
);

describe('Simple Test Suite', () => {
  it('renders simple component correctly', async () => {
    await render(<SimpleComponent />);
    
    // Check if the greeting text exists using testID
    const element = screen.getByTestId('greeting');
    expect(element).toBeTruthy();
    expect(element.props.children).toBe('Hello, TreNote!');
  });

  it('performs standard math check', () => {
    expect(1 + 1).toBe(2);
  });
});