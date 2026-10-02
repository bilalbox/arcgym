import type { ReactElement } from 'react';
import { SimpleNodeTopology } from '../layout/simpleNodes.js';
import {
  type AuthoredBox,
  AuthoredCard,
  AuthoredEdge,
  AuthoredNode,
  AuthoredSvgShell,
  AuthoredZone,
  boxAnchor,
  dockInto,
  elbow,
  elbowInto,
} from '../primitives.js';

export function Agd00801UnifiedTopology(): ReactElement {
  return (
    <SimpleNodeTopology
      prefix="agd00801-unified"
      title="Unified Individual Segment Activation Topology"
      description="Raw DLOs map through Contact DMO and identity resolution into Unified Segment activation."
      stages={[
        { id: 'dlo', name: 'Raw DLOs', subtitle: 'CRM & Web Ingest', width: 100 },
        { id: 'contact', name: 'Contact DMO', subtitle: 'Data Model Mapping', width: 120 },
        {
          id: 'identity',
          name: 'Identity Resolution',
          subtitle: 'Rules & Reconciliation',
          width: 130,
        },
        {
          id: 'segment',
          name: 'Unified Segment',
          subtitle: 'Unified Individual DMO',
          width: 130,
        },
        { id: 'mc', name: 'Marketing Cloud', subtitle: 'Engagement Channel', width: 110 },
      ]}
      gap={40}
    />
  );
}

/** Direct activation skips identity; muted node remains for contrast. */
export function Agd00801DirectTopology(): ReactElement {
  const dlo: AuthoredBox = { x: 25, y: 53, width: 100, height: 54 };
  const contact: AuthoredBox = { x: 165, y: 53, width: 120, height: 54 };
  const identity: AuthoredBox = { x: 370, y: 20, width: 150, height: 54 };
  const mc: AuthoredBox = { x: 665, y: 53, width: 110, height: 54 };
  const prefix = 'agd00801-direct';

  return (
    <AuthoredSvgShell
      prefix={prefix}
      width={800}
      height={160}
      title="Direct Contact DMO Activation Topology"
      description="Contact DMO activates Marketing Cloud directly while identity resolution stays unmapped."
      variant="arcgym"
    >
      <AuthoredNode
        id="dlo"
        {...dlo}
        name="Raw DLOs"
        subtitle="CRM & Web Ingest"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredNode
        id="contact"
        {...contact}
        name="Contact DMO"
        subtitle="Data Model Mapping"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredCard
        id="identity"
        {...identity}
        title="Identity Resolution"
        subtitle="Unmapped Engine"
        variant="muted"
      />
      <AuthoredNode
        id="mc"
        {...mc}
        name="Marketing Cloud"
        subtitle="Engagement Channel"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="dlo"
        to="contact"
        points={elbow(boxAnchor(dlo, 'right'), boxAnchor(contact, 'left'))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="contact"
        to="mc"
        points={elbow(boxAnchor(contact, 'right'), boxAnchor(mc, 'left'))}
        variant="arcgym"
        qaAllow="path-detour"
      />
    </AuthoredSvgShell>
  );
}

export function Agd00801LakeTopology(): ReactElement {
  const dlo: AuthoredBox = { x: 25, y: 53, width: 100, height: 54 };
  const bypass: AuthoredBox = { x: 270, y: 20, width: 260, height: 54 };
  const mc: AuthoredBox = { x: 665, y: 53, width: 110, height: 54 };
  const prefix = 'agd00801-lake';

  return (
    <AuthoredSvgShell
      prefix={prefix}
      width={800}
      height={160}
      title="Raw Data Lake Ingest Push Topology"
      description="Raw DLOs push straight to Marketing Cloud, bypassing the standard Data Cloud layer."
      variant="arcgym"
    >
      <AuthoredNode
        id="dlo"
        {...dlo}
        name="Raw DLOs"
        subtitle="CRM & Web Ingest"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredCard
        id="bypass"
        {...bypass}
        title="Data Cloud Standard Layer"
        subtitle="Unmapped DMOs & Identity Engine"
        variant="muted"
      />
      <AuthoredNode
        id="mc"
        {...mc}
        name="Marketing Cloud"
        subtitle="Engagement Channel"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="dlo"
        to="mc"
        points={elbow(boxAnchor(dlo, 'right'), boxAnchor(mc, 'left'))}
        variant="arcgym"
        qaAllow="path-detour"
      />
    </AuthoredSvgShell>
  );
}

export function Agd00802HubTopology(): ReactElement {
  const home: AuthoredBox = { x: 30, y: 20, width: 270, height: 120 };
  const sales: AuthoredBox = { x: 470, y: 14, width: 300, height: 38 };
  const service: AuthoredBox = { x: 470, y: 60, width: 300, height: 38 };
  const commerce: AuthoredBox = { x: 470, y: 106, width: 300, height: 38 };
  const prefix = 'agd00802-hub';

  return (
    <AuthoredSvgShell
      prefix={prefix}
      width={800}
      height={160}
      title="Data Cloud One Hub-and-Spoke Topology"
      description="A Data Cloud home org fans out through Data Cloud One to companion CRM orgs."
      variant="arcgym"
    >
      <AuthoredCard
        id="home"
        {...home}
        header="Data Cloud Home Org"
        title="Harmonized DMOs & Identity Engine"
        subtitle="Calculated Insights & Data Spaces"
        badge="Digital Wallet: Centralized Credit Allocation"
      />
      <AuthoredNode
        id="sales"
        {...sales}
        name="Sales CRM Companion"
        subtitle="Unified Account Fields"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredNode
        id="service"
        {...service}
        name="Service CRM Companion"
        subtitle="Agentforce Reasoning"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredNode
        id="commerce"
        {...commerce}
        name="Commerce Companion"
        subtitle="Real-Time Personalization"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="home"
        to="sales"
        label="Data Cloud One"
        points={dockInto(boxAnchor(home, 'right', 0.25), boxAnchor(sales, 'left'), 'left')}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="home"
        to="service"
        points={elbow(boxAnchor(home, 'right'), boxAnchor(service, 'left'))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="home"
        to="commerce"
        points={dockInto(boxAnchor(home, 'right', 0.75), boxAnchor(commerce, 'left'), 'left')}
        variant="arcgym"
      />
    </AuthoredSvgShell>
  );
}

export function Agd00802IndependentTopology(): ReactElement {
  const sales: AuthoredBox = { x: 30, y: 20, width: 210, height: 110 };
  const service: AuthoredBox = { x: 295, y: 20, width: 210, height: 110 };
  const commerce: AuthoredBox = { x: 560, y: 20, width: 210, height: 110 };
  const prefix = 'agd00802-indep';

  return (
    <AuthoredSvgShell
      prefix={prefix}
      width={800}
      height={160}
      title="Independent Data Cloud Instances Topology"
      description="Three independent Data Cloud instances sync peer-to-peer via Bulk API and platform events."
      variant="arcgym"
    >
      <AuthoredCard
        id="sales"
        {...sales}
        header="Sales Org + Data Cloud 1"
        title="Local Identity Rules"
        badge="Local DLO/DMO Storage"
      />
      <AuthoredCard
        id="service"
        {...service}
        header="Service Org + Data Cloud 2"
        title="Local Identity Rules"
        badge="Local DLO/DMO Storage"
      />
      <AuthoredCard
        id="commerce"
        {...commerce}
        header="Commerce + Data Cloud 3"
        title="Local Identity Rules"
        badge="Local DLO/DMO Storage"
      />
      <AuthoredEdge
        prefix={prefix}
        from="sales"
        to="service"
        dashed
        points={elbow(boxAnchor(sales, 'right', 0.35), boxAnchor(service, 'left', 0.35))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="service"
        to="sales"
        dashed
        points={elbow(boxAnchor(service, 'left', 0.65), boxAnchor(sales, 'right', 0.65))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="service"
        to="commerce"
        dashed
        points={elbow(boxAnchor(service, 'right', 0.35), boxAnchor(commerce, 'left', 0.35))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="commerce"
        to="service"
        dashed
        points={elbow(boxAnchor(commerce, 'left', 0.65), boxAnchor(service, 'right', 0.65))}
        variant="arcgym"
      />
    </AuthoredSvgShell>
  );
}

export function Agd00803RegionalTopology(): ReactElement {
  const prefix = 'agd00803-regional';
  const euCrm: AuthoredBox = { x: 40, y: 58, width: 130, height: 54 };
  const euDc: AuthoredBox = { x: 210, y: 58, width: 135, height: 54 };
  const naDc: AuthoredBox = { x: 455, y: 58, width: 140, height: 54 };
  const naCrm: AuthoredBox = { x: 635, y: 58, width: 125, height: 54 };

  return (
    <AuthoredSvgShell
      prefix={prefix}
      width={800}
      height={160}
      title="Regional Data Cloud Clusters with Zero Copy Data Sharing"
      description="EU and NA regional clusters exchange models through bidirectional Zero Copy sharing."
      variant="arcgym"
    >
      <AuthoredZone
        x={25}
        y={15}
        width={335}
        height={130}
        label="European Union Boundary"
        variant="arcgym"
      />
      <AuthoredZone
        x={440}
        y={15}
        width={335}
        height={130}
        label="North America Boundary"
        variant="arcgym"
      />
      <AuthoredNode
        id="eu-crm"
        {...euCrm}
        name="EU CRM Org"
        subtitle="Customer PII"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredNode
        id="eu-dc"
        {...euDc}
        name="EU Data Cloud"
        subtitle="Regional Storage"
        family="teal"
        variant="arcgym"
      />
      <AuthoredNode
        id="na-dc"
        {...naDc}
        name="NA Data Cloud"
        subtitle="Shared Global Models"
        family="sky"
        variant="arcgym"
      />
      <AuthoredNode
        id="na-crm"
        {...naCrm}
        name="NA CRM Org"
        subtitle="Global Executive BI"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="eu-crm"
        to="eu-dc"
        points={elbowInto(boxAnchor(euCrm, 'right'), boxAnchor(euDc, 'left'), 'left')}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="eu-dc"
        to="na-dc"
        label="Zero Copy"
        points={elbow(boxAnchor(euDc, 'right', 0.35), boxAnchor(naDc, 'left', 0.35))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="na-dc"
        to="eu-dc"
        label="Share"
        points={elbow(boxAnchor(naDc, 'left', 0.7), boxAnchor(euDc, 'right', 0.7))}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="na-dc"
        to="na-crm"
        points={elbowInto(boxAnchor(naDc, 'right'), boxAnchor(naCrm, 'left'), 'left')}
        variant="arcgym"
      />
    </AuthoredSvgShell>
  );
}

export function Agd00805HybridTopology(): ReactElement {
  const sap: AuthoredBox = { x: 30, y: 25, width: 180, height: 110 };
  const connect: AuthoredBox = { x: 410, y: 15, width: 360, height: 58 };
  const zeroCopy: AuthoredBox = { x: 410, y: 85, width: 360, height: 58 };
  const prefix = 'agd00805-hybrid';

  return (
    <AuthoredSvgShell
      prefix={prefix}
      width={800}
      height={160}
      title="Hybrid Data Virtualization Topology"
      description="SAP data fans out to Salesforce Connect for detail lookups and Data Cloud Zero Copy for analytics."
      variant="arcgym"
    >
      <AuthoredCard
        id="sap"
        {...sap}
        header="SAP ERP Source"
        title="50M Shipment Rows"
        subtitle="OData 4.0 & Lake Export"
        badge="Operational Enterprise Data"
      />
      <AuthoredNode
        id="connect"
        {...connect}
        name="Salesforce Connect External Objects"
        subtitle="Interactive Account Record Detail & Related List"
        family="neutral"
        variant="arcgym"
      />
      <AuthoredNode
        id="zcopy"
        {...zeroCopy}
        name="Data Cloud Zero Copy Engine"
        subtitle="Calculated Insights & Agentforce Propensity Scoring"
        family="teal"
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="sap"
        to="connect"
        label="OData Lookup"
        points={dockInto(boxAnchor(sap, 'right', 0.3), boxAnchor(connect, 'left'), 'left')}
        variant="arcgym"
      />
      <AuthoredEdge
        prefix={prefix}
        from="sap"
        to="zcopy"
        label="Zero Copy"
        points={dockInto(boxAnchor(sap, 'right', 0.75), boxAnchor(zeroCopy, 'left'), 'left')}
        variant="arcgym"
      />
    </AuthoredSvgShell>
  );
}

export const SPECIAL_TOPOLOGY_RENDERERS: Record<string, () => ReactElement> = {
  'agd-00801-unified-topology': Agd00801UnifiedTopology,
  'agd-00801-direct-topology': Agd00801DirectTopology,
  'agd-00801-lake-topology': Agd00801LakeTopology,
  'agd-00802-hub-topology': Agd00802HubTopology,
  'agd-00802-independent-topology': Agd00802IndependentTopology,
  'agd-00803-regional-topology': Agd00803RegionalTopology,
  'agd-00805-hybrid-topology': Agd00805HybridTopology,
};
