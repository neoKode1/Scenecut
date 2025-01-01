import { NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

export async function GET() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Missing Anthropic API key');
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // Try a simple message to test the connection
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say "Hello! The connection is working!" if you receive this message.'
      }]
    });

    // Get the text content from the first content block
    const content = message.content[0];
    const responseText = 'type' in content && content.type === 'text' ? content.text : 'No text response';

    return NextResponse.json({
      success: true,
      response: responseText,
      model: message.model
    });

  } catch (error) {
    console.error('Anthropic API test failed');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 500 });
  }
} 