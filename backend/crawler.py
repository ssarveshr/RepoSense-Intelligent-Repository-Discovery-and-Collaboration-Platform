import requests
import time
from search_engine import engine

# Define the categories we want to populate our "Discovery" feed with
CATEGORIES = {
    "Web Development": "topic:web-development",
    "Machine Learning": "topic:machine-learning",
    "Blockchain": "topic:blockchain",
    "IoT": "topic:iot",
    "DevOps": "topic:devops",
    "Cybersecurity": "topic:security",
    "Data Science": "topic:data-science"
}

def fetch_github_repos():
    """
    Fetches top repositories from GitHub for each category and 
    indexes them into our vector database.
    """
    print("🚀 Starting GitHub Discovery Crawler...")
    print("---------------------------------------")
    
    for category, query in CATEGORIES.items():
        print(f"📂 Processing Category: {category}...")
        
        # We search for repositories with more than 500 stars to ensure quality
        # Using the public search API (Limited to 10 requests per minute unauthenticated)
        url = f"https://api.github.com/search/repositories?q={query}+stars:>500&sort=stars&order=desc"
        
        try:
            headers = {'Accept': 'application/vnd.github.v3+json'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                repos = data.get('items', [])
                
                count = 0
                for repo in repos[:15]: # Index top 15 per category
                    engine.add_repository(
                        name=repo['name'],
                        description=repo['description'] or "A specialized open source project.",
                        url=repo['html_url'],
                        stars=repo['stargazers_count'],
                        category=category
                    )
                    count += 1
                
                print(f"✅ Successfully indexed {count} repositories for {category}.")
            
            elif response.status_code == 403:
                print("⚠️ Rate limit reached! Waiting 60 seconds...")
                time.sleep(60)
                continue
            else:
                print(f"❌ Failed to fetch {category}. Status: {response.status_code}")
                
            # Small delay between categories to stay within rate limits
            time.sleep(5)
            
        except Exception as e:
            print(f"⚠️ An error occurred while crawling {category}: {e}")

    print("---------------------------------------")
    print("✨ Database Seeding Complete! RepoSense is now intelligent.")

if __name__ == "__main__":
    fetch_github_repos()
