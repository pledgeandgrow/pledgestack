import { describe, it, expect } from 'vitest';
import {
  generateLayerStructure,
  generateAddonLoader,
  generateSamTemplate,
  generateLambdaCargoConfig,
  checkSnapstartCompatibility,
  generateSnapstartWrapper,
  generatePrewarmScript,
} from './lambda-psx';

describe('Lambda PSX Support (#276)', () => {
  describe('generateLayerStructure', () => {
    it('generates layer with modules', () => {
      const result = generateLayerStructure({
        layerName: 'pledge-psx',
        architecture: 'arm64',
        runtime: 'nodejs20.x',
        modules: ['mod1', 'mod2'],
        addonDir: '/tmp/addons',
      }, '/tmp/layer');
      expect(result.layerName).toBe('pledge-psx');
      expect(result.architecture).toBe('arm64');
      expect(result.modules).toEqual(['mod1', 'mod2']);
    });
  });

  describe('generateAddonLoader', () => {
    it('generates loader for multiple modules', () => {
      const loader = generateAddonLoader(['mod1', 'mod2']);
      expect(loader).toContain('mod1');
      expect(loader).toContain('mod2');
      expect(loader).toContain('loadAddon');
    });
  });

  describe('generateSamTemplate', () => {
    it('generates SAM template with correct config', () => {
      const template = generateSamTemplate({
        functionName: 'PledgeFunction',
        handler: 'index.handler',
        runtime: 'nodejs20.x',
        architecture: 'arm64',
        memorySize: 512,
        timeout: 30,
        environment: { NODE_ENV: 'production' },
        layers: ['arn:aws:lambda:us-east-1:123:layer:pledge-psx'],
      });
      expect(template).toContain('PledgeFunction');
      expect(template).toContain('nodejs20.x');
      expect(template).toContain('arm64');
      expect(template).toContain('NODE_ENV');
    });

    it('includes provisioned concurrency when configured', () => {
      const template = generateSamTemplate({
        functionName: 'PledgeFunction',
        handler: 'index.handler',
        runtime: 'nodejs20.x',
        architecture: 'x86_64',
        memorySize: 256,
        timeout: 10,
        environment: {},
        layers: [],
        provisionedConcurrency: 5,
      });
      expect(template).toContain('ProvisionedConcurrentExecutions');
      expect(template).toContain('5');
    });
  });

  describe('generateLambdaCargoConfig', () => {
    it('generates ARM64 target config', () => {
      const config = generateLambdaCargoConfig('test', 'arm64');
      expect(config).toContain('aarch64-unknown-linux-gnu');
      expect(config).toContain('pledge-test-lambda');
    });

    it('generates x86_64 target config', () => {
      const config = generateLambdaCargoConfig('test', 'x86_64');
      expect(config).toContain('x86_64-unknown-linux-gnu');
    });
  });

  describe('checkSnapstartCompatibility', () => {
    it('flags static socket initialization', () => {
      const result = checkSnapstartCompatibility(
        'static SOCKET: TcpStream = TcpStream::connect("localhost:8080").unwrap();',
      );
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('flags static Instant::now', () => {
      const result = checkSnapstartCompatibility(
        'static START: Instant = Instant::now();',
      );
      expect(result.compatible).toBe(false);
    });

    it('passes for clean code', () => {
      const result = checkSnapstartCompatibility(
        'pub fn handle_request() -> i32 { 42 }',
      );
      expect(result.compatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('generateSnapstartWrapper', () => {
    it('generates wrapper with init', () => {
      const wrapper = generateSnapstartWrapper('test');
      expect(wrapper).toContain('ensureInitialized');
      expect(wrapper).toContain('handler');
    });
  });

  describe('generatePrewarmScript', () => {
    it('generates pre-warm script', () => {
      const script = generatePrewarmScript('PledgeFunction', 'us-east-1');
      expect(script).toContain('PledgeFunction');
      expect(script).toContain('us-east-1');
      expect(script).toContain('prewarm');
    });
  });
});
