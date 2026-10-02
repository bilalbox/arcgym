import type { ReactElement } from 'react';
import { type LinearCardStage, LinearCardTopology } from '../layout/linearCards.js';

type LinearDef = {
  id: string;
  title: string;
  description: string;
  stages: LinearCardStage[];
  edgeLabels: string[];
  gap?: number;
};

function sequential(def: LinearDef): ReactElement {
  const edges = def.stages.slice(0, -1).map((stage, i) => ({
    from: stage.id,
    to: def.stages[i + 1].id,
    label: def.edgeLabels[i] ?? '',
  }));
  return (
    <LinearCardTopology
      prefix={def.id.replace(/[^a-z0-9]+/gi, '-')}
      title={def.title}
      description={def.description}
      stages={def.stages}
      edges={edges}
      gap={def.gap}
    />
  );
}

/** Straight-line AuthoredCard topologies (majority of Rapid Fire option art). */
export const LINEAR_TOPOLOGY_DEFS: LinearDef[] = [
  {
    id: 'agd-00802-custom-sync-topology',
    title: 'Reverse ETL Synchronization to Custom Objects Topology',
    description:
      'Data Cloud lakehouse profiles sync into companion-org custom objects via Reverse ETL.',
    gap: 160,
    stages: [
      {
        id: 'dc-lake',
        header: 'Data Cloud Lakehouse',
        title: 'Unified Profiles & Insights',
        subtitle: 'Unified Customer Records',
        badge: 'Source of Truth Profiles',
      },
      {
        id: 'companion',
        header: 'Companion Orgs Storage',
        title: 'Custom Object: Customer_360_Profile__c',
        subtitle: 'Nightly Scheduled Batch Ingestion',
        badge: 'Relational Lookups & Page Layouts',
      },
    ],
    edgeLabels: ['Reverse ETL / Bulk API'],
  },
  {
    id: 'agd-00803-proxy-topology',
    title: 'Edge Anonymization Proxy Ingestion Topology',
    description:
      'EU CRM records are tokenized by an on-prem proxy before Global Data Cloud identity matching.',
    stages: [
      {
        id: 'eu-crm',
        header: 'EU CRM Org',
        title: 'Raw Customer Records',
        subtitle: 'Name, Email, Phone, Address',
        badge: 'Source PII Boundary',
      },
      {
        id: 'proxy',
        header: 'On-Premises Scrubbing Proxy',
        title: 'Tokenizes Identifier Fields',
        subtitle: 'Irreversible Hash Algorithms',
        badge: 'Edge Anonymization',
      },
      {
        id: 'global-dc',
        header: 'Global Data Cloud',
        title: 'Identity Resolution Engine',
        subtitle: 'Matching on Anonymized Strings',
        badge: 'Hashed Match Keys Only',
      },
    ],
    edgeLabels: ['Scrub', 'Ingest'],
  },
  {
    id: 'agd-00803-cross-border-topology',
    title: 'Cross-Border Companion Link Topology',
    description:
      'EU companion org links across region into a North America Data Cloud home tenant.',
    gap: 160,
    stages: [
      {
        id: 'eu-boundary',
        header: 'European Subsidiary Boundary',
        title: 'EU CRM Companion Org',
        subtitle: 'Local Customer & Order Records',
        badge: 'Regional CRM Boundary',
        width: 260,
      },
      {
        id: 'na-tenant',
        header: 'North America Tenant',
        title: 'Central Data Cloud Home Org',
        subtitle: 'Identity Resolution & DMO Storage',
        badge: 'Cross-Region Home Org',
        width: 260,
      },
    ],
    edgeLabels: ['Data Cloud One Link'],
  },
  {
    id: 'agd-00804-batch-lake-topology',
    title: 'Batch Ingestion Lake Duplication Topology',
    description: 'Snowflake warehouse rows are batch-ingested into native Data Cloud DLO storage.',
    gap: 160,
    stages: [
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: '120M Order Records',
        subtitle: 'Primary Warehouse Storage',
        badge: 'Source Warehouse',
        width: 260,
      },
      {
        id: 'dc-storage',
        header: 'Native Data Cloud Storage',
        title: 'Data Lake Objects (DLOs)',
        subtitle: 'Replicated Ingested File Storage',
        badge: '4-Hour Scheduled Batch',
        width: 260,
      },
    ],
    edgeLabels: ['Batch Ingest'],
  },
  {
    id: 'agd-00804-cached-topology',
    title: 'Accelerated Query Caching Topology',
    description: 'Zero Copy cache sits between Snowflake and high-QPS CRM / Agentforce readers.',
    gap: 70,
    stages: [
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: '120M Order Records',
        subtitle: 'External Table Storage',
        badge: 'Federated Source Tables',
      },
      {
        id: 'cache',
        header: 'Data Cloud Zero Copy',
        title: 'Accelerated Query Cache',
        subtitle: 'Materialized Cache Layer',
        badge: 'Configured Cache TTL',
      },
      {
        id: 'clients',
        header: 'High-QPS Traffic',
        title: 'CRM Users & Agentforce',
        subtitle: '600+ Requests / Minute',
        badge: 'Operational Reads',
      },
    ],
    edgeLabels: ['Refresh', 'Cached'],
  },
  {
    id: 'agd-00804-live-query-topology',
    title: 'Direct Live Query Pushdown Topology',
    description: 'CRM traffic issues live pushdown queries onto Snowflake multi-cluster compute.',
    gap: 160,
    stages: [
      {
        id: 'crm-traffic',
        header: 'Continuous CRM Traffic',
        title: '600+ Requests / Minute',
        subtitle: 'CRM Record Pages & Agentforce',
        badge: 'Synchronous REST / SQL Callouts',
        width: 260,
      },
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: 'Multi-Cluster Warehouse',
        subtitle: 'Direct Execution on Source Compute',
        badge: 'Active Compute Clustered per Query',
        width: 260,
      },
    ],
    edgeLabels: ['Live Pushdown'],
  },
  {
    id: 'agd-00805-custom-load-topology',
    title: 'Custom Object ETL Bulk Load Topology',
    description: 'SAP shipment extracts land in a Core Salesforce custom object via Bulk API 2.0.',
    gap: 160,
    stages: [
      {
        id: 'sap',
        header: 'SAP ERP Source',
        title: '50M Shipment Rows',
        subtitle: 'Nightly Bulk Export',
        badge: 'File / Database Extraction',
        width: 260,
      },
      {
        id: 'custom-obj',
        header: 'Core Salesforce Custom Object',
        title: 'Shipment__c (50 Million Rows)',
        subtitle: 'Relational Database Storage in Core Org',
        badge: 'Standard Detail Views & SOQL Queries',
        width: 260,
      },
    ],
    edgeLabels: ['Bulk API 2.0'],
  },
  {
    id: 'agd-00805-external-reporting-topology',
    title: 'Salesforce Connect External Objects Reporting Topology',
    description: 'Reports and dashboards page SAP rows through OData external objects.',
    gap: 160,
    stages: [
      {
        id: 'sap',
        header: 'SAP ERP Source',
        title: '50M Shipment Rows',
        subtitle: 'OData 4.0 Producer Endpoint',
        badge: 'Synchronous HTTP Service',
        width: 260,
      },
      {
        id: 'reports',
        header: 'Salesforce Reports & Dashboards',
        title: 'External Object: Shipment__x',
        subtitle: 'Cross-Table Rollups & Multi-Million Row Grouping',
        badge: 'Direct Real-Time OData Paging via Adapter',
        width: 260,
      },
    ],
    edgeLabels: ['OData Callouts'],
  },
  {
    id: 'agd-00806-iceberg-topology',
    title: 'Zero Copy File Federation with S3 Iceberg Catalog Topology',
    description:
      'Same-region Iceberg federation feeds Agentforce and insights without copying S3 data.',
    stages: [
      {
        id: 's3',
        header: 'Amazon S3 Lake [us-east-1]',
        title: 'Apache Iceberg / Parquet',
        subtitle: '400 TB Diagnostic Telemetry',
        badge: 'Partitioned Columnar Format',
      },
      {
        id: 'dc',
        header: 'Data Cloud [us-east-1]',
        title: 'File Federation Catalog',
        subtitle: 'In-Place Reads via Iceberg Metadata',
        badge: 'Same-Region Network Placement',
      },
      {
        id: 'agents',
        header: 'Agentforce & Insights',
        title: 'Anomaly Scoring',
        subtitle: 'Direct Query Grounding',
        badge: 'Operational Workflows',
      },
    ],
    edgeLabels: ['Zero Copy', 'Query'],
  },
  {
    id: 'agd-00806-s3-ingest-topology',
    title: 'S3 Continuous Data Stream Ingestion Topology',
    description: 'S3 telemetry is continuously streamed into native Data Cloud DLO storage.',
    gap: 160,
    stages: [
      {
        id: 's3',
        header: 'Amazon S3 Source',
        title: '400 TB Telemetry Logs',
        subtitle: 'Primary File Repository',
        badge: 'Raw S3 Bucket Storage',
        width: 260,
      },
      {
        id: 'dc',
        header: 'Native Data Cloud Storage',
        title: 'Data Lake Objects (DLOs)',
        subtitle: 'Continuous Batch File Replication',
        badge: 'Internal Lakehouse Storage Model',
        width: 260,
      },
    ],
    edgeLabels: ['S3 Stream Ingest'],
  },
  {
    id: 'agd-00806-staging-rds-topology',
    title: 'Intermediate Relational Staging Database Topology',
    description: 'S3 lake data stages through PostgreSQL before Data Cloud ingestion streams.',
    stages: [
      {
        id: 's3',
        header: 'Amazon S3 Lake',
        title: '400 TB Telemetry',
        subtitle: 'Parquet Files',
        badge: 'Source Object Store',
      },
      {
        id: 'staging',
        header: 'Intermediate Staging Database',
        title: 'Relational PostgreSQL Tables',
        subtitle: 'SQL Aggregations & Staging Views',
        badge: 'Intermediary Relational Compute',
      },
      {
        id: 'dc',
        header: 'Data Cloud Platform',
        title: 'Ingestion Data Streams',
        subtitle: 'Reverse ETL Push Jobs',
        badge: 'Target Stream Objects',
      },
    ],
    edgeLabels: ['Stage', 'Ingest'],
  },
  {
    id: 'agd-00807-bdt-materialization-topology',
    title: 'Batch Data Transform Materialization Topology',
    description:
      'Federated Snowflake orders are read by Batch Data Transform and written to SalesOrder DMO.',
    stages: [
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: '500M Orders Table',
        subtitle: 'Raw External Orders Dataset',
        badge: 'Zero Copy Federated Source',
      },
      {
        id: 'bdt',
        header: 'Batch Data Transform',
        title: 'Spark ETL Processing',
        subtitle: 'Date Cleansing & Re-encoding',
        badge: 'Batch Compute Execution',
      },
      {
        id: 'storage',
        header: 'Data Cloud Storage',
        title: 'SalesOrder DMO',
        subtitle: 'Materialized Parquet Storage',
        badge: 'Duplicated Lakehouse Volume',
      },
    ],
    edgeLabels: ['Read', 'Write'],
  },
  {
    id: 'agd-00807-scheduler-limits-topology',
    title: 'Multi-Tenant Batch Pipeline Execution Limits Topology',
    description: 'Scheduled Batch Data Transform jobs queue into shared tenant worker pools.',
    stages: [
      {
        id: 'bdt',
        header: 'Batch Data Transform',
        title: 'Scheduled Pipeline',
        subtitle: 'Hourly / Daily Job Trigger',
        badge: 'Defined Ingestion Window',
      },
      {
        id: 'orchestrator',
        header: 'Job Orchestrator',
        title: 'Task Schedule Queue',
        subtitle: 'Batch Window Allocation',
        badge: 'Non-Persistent Cluster Lock',
      },
      {
        id: 'workers',
        header: 'Tenant Worker Pool',
        title: 'Shared Spark Cluster',
        subtitle: 'Isolated Slot Management',
        badge: 'Tenant Concurrency Quotas',
      },
    ],
    edgeLabels: ['Queue', 'Assign'],
  },
  {
    id: 'agd-00807-stream-exceptions-topology',
    title: 'External Table Schema Validation in Batch Data Transform',
    description:
      'Federated lake objects bind into Batch Data Transform only after catalog schema validation.',
    stages: [
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: 'External Table Object',
        subtitle: 'Federated Table Metadata',
        badge: 'Source Object Registration',
      },
      {
        id: 'catalog',
        header: 'Data Cloud Catalog',
        title: 'Federated Lake Object',
        subtitle: 'Direct Schema Mapping',
        badge: 'Supported Pipeline Input',
      },
      {
        id: 'bdt',
        header: 'Batch Data Transform',
        title: 'Pipeline Input Node',
        subtitle: 'Verified Graph Integration',
        badge: 'Valid Schema Execution',
      },
    ],
    edgeLabels: ['Federate', 'Bind'],
  },
  {
    id: 'agd-00808-ansi-syntax-topology',
    title: 'Calculated Insight ANSI SQL Parser Evaluation Topology',
    description: 'Insight SQL is parsed and planned before metric graph compilation.',
    stages: [
      {
        id: 'sql-def',
        header: 'Insight SQL Definition',
        title: 'ANSI SQL Expressions',
        subtitle: 'CASE, COALESCE, Windowing',
        badge: 'Standard SQL Syntax',
      },
      {
        id: 'parser',
        header: 'SQL Parser Engine',
        title: 'ANSI Grammar Validator',
        subtitle: 'Syntax Tree & Expression Check',
        badge: 'Supported Language Model',
      },
      {
        id: 'planner',
        header: 'Execution Planner',
        title: 'Metric Graph',
        subtitle: 'Rollup Measure Construction',
        badge: 'Compiled Query Plan',
      },
    ],
    edgeLabels: ['Parse', 'Plan'],
  },
  {
    id: 'agd-00808-ci-aggregation-topology',
    title: 'Calculated Insights Aggregation Model Topology',
    description:
      'BigQuery row grain aggregates through Calculated Insights into CIO summary metrics.',
    stages: [
      {
        id: 'bq',
        header: 'Google BigQuery',
        title: 'Transaction Rows',
        subtitle: 'Discrete Row-Level Data',
        badge: 'Entity Record Grain',
      },
      {
        id: 'engine',
        header: 'Calculated Insight Engine',
        title: 'GROUP BY Dimensions',
        subtitle: 'SUM, COUNT, MAX Metrics',
        badge: 'Multidimensional Aggregator',
      },
      {
        id: 'cio',
        header: 'Insight Object (CIO)',
        title: 'Aggregated Metrics',
        subtitle: 'Segment & Activation Grain',
        badge: 'Summary Level Output',
      },
    ],
    edgeLabels: ['Query', 'Rollup'],
  },
  {
    id: 'agd-00808-zero-copy-source-topology',
    title: 'Zero Copy Federated Source in Calculated Insights Topology',
    description:
      'External BigQuery lakehouse linked as a federated DMO and queried by a Calculated Insight metric pipeline.',
    stages: [
      {
        id: 'bq-source',
        header: 'Google BigQuery',
        title: 'External Lakehouse',
        subtitle: 'Remote Analytical Tables',
        badge: 'Zero Copy Data Share',
      },
      {
        id: 'federated-dmo',
        header: 'Data Cloud Catalog',
        title: 'Federated DMO',
        subtitle: 'Direct Schema Mapping',
        badge: 'Supported Insight Target',
      },
      {
        id: 'calc-insight',
        header: 'Calculated Insight',
        title: 'Metric Pipeline',
        subtitle: 'Queries Federated Lake Data',
        badge: 'Permitted Source Model',
      },
    ],
    edgeLabels: ['Link', 'Query'],
  },
  {
    id: 'agd-00809-curated-view-topology',
    title: 'Curated Snowflake View Enforcing Uniqueness and Column Pruning Topology',
    description: 'A curated Snowflake view dedupes and prunes columns before Data Cloud grounding.',
    stages: [
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: 'Raw Transactions',
        subtitle: '140 Raw Fields & Duplicates',
        badge: 'Source Storage Layer',
      },
      {
        id: 'view',
        header: 'Snowflake Curated View',
        title: 'Deduplication & Pruning',
        subtitle: 'QUALIFY Dedupe | 12 Fields Selected',
        badge: 'Source-Engine Cleanse',
      },
      {
        id: 'grounding',
        header: 'Data Cloud Grounding',
        title: 'Agentforce Grounding',
        subtitle: '12-Column Schema Binding',
        badge: 'Zero Copy Egress Minimized',
      },
    ],
    edgeLabels: ['View', 'Federate'],
  },
  {
    id: 'agd-00809-formula-fields-topology',
    title: 'Formula Field Expressions on Federated Lake Objects Topology',
    description:
      'Wide federated objects with formula expressions block pushdown and inflate egress.',
    stages: [
      {
        id: 'snowflake',
        header: 'Snowflake Lakehouse',
        title: 'Unpruned Raw Table',
        subtitle: '140 Wide Schema Columns',
        badge: 'Broad Schema Projection',
      },
      {
        id: 'flo',
        header: 'Federated Lake Object',
        title: 'Formula Expressions',
        subtitle: 'Runtime Dynamic Calculations',
        badge: '140 Column Virtual Object',
      },
      {
        id: 'grounding',
        header: 'Agentforce Grounding',
        title: 'Runtime Evaluation',
        subtitle: 'Predicate Pushdown Blocked',
        badge: 'Full Column Network Egress',
      },
    ],
    edgeLabels: ['Scan', 'Query'],
  },
  {
    id: 'agd-00809-id-resolution-topology',
    title: 'Identity Resolution Engine Applied to Raw Transactions Topology',
    description: 'Raw transaction rows feed identity resolution into Unified Individual profiles.',
    stages: [
      {
        id: 'raw',
        header: 'Raw Transactions',
        title: 'Snowflake Lakehouse',
        subtitle: '140 Raw Fields & Duplicates',
        badge: 'Transaction Record Grain',
      },
      {
        id: 'ir',
        header: 'Identity Resolution',
        title: 'Match Rules Engine',
        subtitle: 'Party Identification & Linking',
        badge: 'Customer Profile Matching',
      },
      {
        id: 'unified',
        header: 'Unified Profiles',
        title: 'Unified Individual DMO',
        subtitle: 'Person Identity Master',
        badge: 'Party Level Resolution Only',
      },
    ],
    edgeLabels: ['Feed', 'Unify'],
  },
];

export const LINEAR_TOPOLOGY_RENDERERS: Record<string, () => ReactElement> = Object.fromEntries(
  LINEAR_TOPOLOGY_DEFS.map((def) => [def.id, () => sequential(def)]),
);
