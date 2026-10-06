import crypto from 'crypto';

export interface LedgerBlock {
  blockNumber: number;
  previousHash: string;
  dataHash: string;
  timestamp: string;
  transactions: {
    txId: string;
    chaincode: string;
    function: string;
    args: any[];
    timestamp: string;
  }[];
}

export class FabricEmulator {
  private worldState: Map<string, string> = new Map();
  private blocks: LedgerBlock[] = [];
  private historyMap: Map<string, { txId: string; timestamp: string; value: any }[]> = new Map();

  constructor() {
    // Create Genesis Block #0
    const genesisBlock: LedgerBlock = {
      blockNumber: 0,
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
      dataHash: crypto.createHash('sha256').update('GENESIS_BLOCK_CERTLLEDGER_CHANNEL').digest('hex'),
      timestamp: new Date().toISOString(),
      transactions: []
    };
    this.blocks.push(genesisBlock);
    this.seedSampleData();
  }

  private seedSampleData() {
    const seedCert = {
      docType: 'certificate',
      certificateId: 'CERT-2026-1001',
      studentId: 'STD-101',
      studentName: 'Alex Rivera',
      courseId: 'CRS-501',
      courseTitle: 'Introduction to Blockchain & Hyperledger Fabric Architecture',
      teacherId: 'TCH-201',
      teacherName: 'Prof. Michael Faraday',
      platformAdminId: 'SUPER-ADMIN-01',
      score: 100,
      issueTimestamp: new Date().toISOString(),
      completionHash: crypto.createHash('sha256').update('STD-101-CRS-501-100').digest('hex'),
      signatures: {
        student: {
          signed: true,
          signerId: 'STD-101',
          signerName: 'Alex Rivera',
          signedAt: new Date().toISOString(),
          signatureHash: 'sig_std_' + crypto.randomBytes(6).toString('hex')
        },
        teacher: {
          signed: true,
          signerId: 'TCH-201',
          signerName: 'Prof. Michael Faraday',
          signedAt: new Date().toISOString(),
          signatureHash: 'sig_tch_' + crypto.randomBytes(6).toString('hex')
        },
        platformAdmin: {
          signed: true,
          signerId: 'SUPER-ADMIN-01',
          signerName: 'EdX Platform Provider',
          signedAt: new Date().toISOString(),
          signatureHash: 'sig_platform_' + crypto.randomBytes(6).toString('hex')
        }
      },
      status: 'ISSUED_VALID',
      revoked: false
    };

    this.putState('CERT-2026-1001', JSON.stringify(seedCert), 'SEED_TX_001', 'InitLedger', []);
  }

  public getState(key: string): string | null {
    return this.worldState.get(key) || null;
  }

  public putState(key: string, value: string, txId: string, fnName: string, args: any[]): void {
    this.worldState.set(key, value);

    const parsedVal = JSON.parse(value);
    const now = new Date().toISOString();

    if (!this.historyMap.has(key)) {
      this.historyMap.set(key, []);
    }
    this.historyMap.get(key)!.push({
      txId,
      timestamp: now,
      value: parsedVal
    });

    // Append to Fabric Block
    const prevBlock = this.blocks[this.blocks.length - 1];
    const newBlockNumber = this.blocks.length;

    const blockData = {
      txId,
      chaincode: 'certledger',
      function: fnName,
      args,
      timestamp: now
    };

    const dataHash = crypto.createHash('sha256').update(JSON.stringify(blockData)).digest('hex');

    const newBlock: LedgerBlock = {
      blockNumber: newBlockNumber,
      previousHash: prevBlock.dataHash,
      dataHash,
      timestamp: now,
      transactions: [blockData]
    };

    this.blocks.push(newBlock);
  }

  public getHistory(key: string) {
    return this.historyMap.get(key) || [];
  }

  public getAllCertificates() {
    const list: any[] = [];
    this.worldState.forEach((val) => {
      try {
        const parsed = JSON.parse(val);
        if (parsed.docType === 'certificate') {
          list.push(parsed);
        }
      } catch (err) {}
    });
    return list;
  }

  public getBlocks() {
    return this.blocks;
  }
}

export const fabricEmulatorInstance = new FabricEmulator();
