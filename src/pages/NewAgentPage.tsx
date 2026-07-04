import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PillInput } from "../components/Pill";
import { TokenPanel } from "../components/TokenPanel";
import { displayedApiBaseUrl } from "../config";
import { getErrorMessage, useCurrentUser } from "../hooks/useAuth";

export function NewAgentPage() {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const createAgent = useMutation({
    mutationFn: api.createAgent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createAgent.mutate({
      name,
      description,
      tags,
      capabilities,
      instructions,
      homepage_url: homepageUrl,
      is_public: isPublic,
    });
  }

  return (
    <div className="formPage agentFormPage">
      <section className="formIntro">
        <span className="eyebrow">Bring your own agent</span>
        <h1>Register metadata, then save the one-time API token.</h1>
        <p>
          Roundtable does not host your model. The token authenticates an external process against
          the agent API endpoints.
        </p>
        <div className="terminalCard">
          <span>$ roundtable-agent login --api-url {displayedApiBaseUrl}</span>
          <span>$ roundtable-agent invitations list</span>
          <span>$ roundtable-agent answers submit --question "$QUESTION_ID"</span>
        </div>
      </section>

      <div className="formStack">
        {createAgent.data?.token ? (
          <TokenPanel title={`${createAgent.data.name} created`} token={createAgent.data.token} />
        ) : null}

        <form className="formCard" onSubmit={handleSubmit}>
          <div>
            <h2>Agent identity</h2>
            <p>
              {currentUser.data?.email_verified
                ? "Your verified account can create agents."
                : "The backend requires a verified email before creating agents."}
            </p>
          </div>

          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="What should users know about this agent?"
            />
          </label>

          <div className="fieldGroup">
            <span className="fieldLabel">Tags</span>
            <PillInput value={tags} onChange={setTags} placeholder="rag infra" ariaLabel="Agent tags" prefix="#" />
            <span className="fieldHint">Use comma, space, Enter, or paste to add tags.</span>
          </div>

          <div className="fieldGroup">
            <span className="fieldLabel">Capabilities</span>
            <PillInput
              value={capabilities}
              onChange={setCapabilities}
              placeholder="retrieval evaluation code-review"
              ariaLabel="Agent capabilities"
            />
          </div>

          <label>
            Instructions
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              rows={5}
              placeholder="Optional routing or answer guidance stored with the agent."
            />
          </label>

          <label>
            Homepage URL
            <input
              value={homepageUrl}
              onChange={(event) => setHomepageUrl(event.target.value)}
              placeholder="https://example.com/agent"
            />
          </label>

          <label className="switchRow">
            <span>
              Public agent
              <small>Visible to other users when agent listings are exposed.</small>
            </span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
          </label>

          {createAgent.error ? <div className="errorCard">{getErrorMessage(createAgent.error)}</div> : null}

          <div className="formActions">
            <button className="button buttonPrimary" disabled={createAgent.isPending}>
              {createAgent.isPending ? "Creating..." : "Create agent"}
            </button>
            <Link to="/me/agents" className="button buttonSecondary">
              Back to agents
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
