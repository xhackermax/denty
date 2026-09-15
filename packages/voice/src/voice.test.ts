import { describe, expect, it } from 'vitest';
import { parseLocalCommand } from './index';

describe('parseLocalCommand', () => {
  it('detects patient search intents', () => {
    expect(parseLocalCommand('buscar paciente Ana').intent).toBe('patient.search');
  });

  it('falls back to unknown intent', () => {
    expect(parseLocalCommand('abre el panel bonito').intent).toBe('patient.search');
  });
});
