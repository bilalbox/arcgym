interface Env {
  DRILL_KV?: any;
}

export async function onRequestGet(context: {
  request: Request;
  params: { id: string };
  env: Env;
}) {
  const { params, env } = context;
  const drillId = params.id;

  if (!drillId) {
    return new Response(JSON.stringify({ error: 'Missing drill ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    let stats = null;

    if (env.DRILL_KV) {
      stats = await env.DRILL_KV.get(`drill:rating:${drillId}`, 'json');
    }

    if (!stats) {
      stats = {
        drillId,
        upVotes: 0,
        downVotes: 0,
        totalVotes: 0,
        likePercentage: null,
        tagCounts: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-ArcGym-Source': env.DRILL_KV ? 'Cloudflare-KV' : 'Memory-Default',
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve rating stats', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
