import chromadb
from sentence_transformers import SentenceTransformer
import os

class RepoSenseEngine:
    def __init__(self):
        # 1. Initialize the AI Model for embeddings
        # This will download the model (~80MB) on the first run
        self.model_name = 'all-MiniLM-L6-v2'
        self.model = SentenceTransformer(self.model_name)
        
        # 2. Setup ChromaDB (Persistent storage in the current directory)
        self.db_path = os.path.join(os.path.dirname(__file__), "repo_db")
        self.client = chromadb.PersistentClient(path=self.db_path)
        
        # 3. Create or get the collection
        self.collection = self.client.get_or_create_collection(
            name="repositories",
            metadata={"hnsw:space": "cosine"}
        )

    def add_repository(self, name, description, url, stars, category, readme=""):
        """Adds a repository to the vector database."""
        # Combine metadata into a single string for embedding
        full_text = f"Project: {name}. Category: {category}. Description: {description}. Details: {readme[:1000]}"
        
        # Generate embedding
        embedding = self.model.encode(full_text).tolist()
        
        # Upsert into ChromaDB (updates if URL exists, otherwise inserts)
        self.collection.upsert(
            ids=[url],
            embeddings=[embedding],
            metadatas=[{
                "name": name,
                "description": description,
                "url": url,
                "stars": stars,
                "category": category
            }],
            documents=[full_text]
        )

    def search(self, query, limit=6):
        """Performs hybrid search (Exact Name Match + Semantic Similarity)"""
        
        # 1. Semantic Vector Search
        query_embedding = self.model.encode(query).tolist()
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit
        )
        
        # 2. Process and Rank Results
        formatted_results = []
        if not results['ids'] or not results['ids'][0]:
            return []

        for i in range(len(results['ids'][0])):
            meta = results['metadatas'][0][i]
            
            # Calculate a base similarity score (1 - distance)
            # ChromaDB cosine distance: 0 is identical, 2 is opposite.
            similarity = 1.0 - results['distances'][0][i]
            
            # --- Hybrid Boosting Logic ---
            # If the query exactly matches or is contained in the name, boost the score
            name_boost = 0
            q_lower = query.lower()
            name_lower = meta['name'].lower()
            
            if q_lower == name_lower:
                name_boost = 0.8  # Strong boost for exact match
            elif q_lower in name_lower:
                name_boost = 0.4  # Moderate boost for partial match
                
            final_score = similarity + name_boost
                
            formatted_results.append({
                "id": results['ids'][0][i],
                "name": meta['name'],
                "description": meta['description'],
                "url": meta['url'],
                "stars": meta['stars'],
                "category": meta['category'],
                "match_score": round(final_score, 4)
            })
            
        # 3. Final Sort by the boosted score
        formatted_results.sort(key=lambda x: x['match_score'], reverse=True)
        return formatted_results

    def rank_results(self, query, repos, limit=10):
        """
        Takes a query and a list of external repo objects,
        ranks them semantically, and returns the top matches.
        """
        if not repos:
            return []

        # 1. Encode query and all repo texts
        query_emb = self.model.encode(query)
        
        # Prepare descriptions for encoding
        repo_texts = [f"{r['name']}: {r['description']}" for r in repos]
        repo_embs = self.model.encode(repo_texts)

        # 2. Calculate similarity for each
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity([query_emb], repo_embs)[0]

        # 3. Format and Apply Hybrid Boosting
        ranked_list = []
        for i, repo in enumerate(repos):
            score = float(similarities[i])
            
            # Name boost
            if query.lower() in repo['name'].lower():
                score += 0.4
            
            repo['match_score'] = round(score, 4)
            ranked_list.append(repo)

        # 4. Sort and limit
        ranked_list.sort(key=lambda x: x['match_score'], reverse=True)
        return ranked_list[:limit]

# Singleton instance
engine = RepoSenseEngine()
