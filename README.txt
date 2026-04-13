Run Development Server:

npm.cmd run dev

Update loop:

git add .
git commit -m "Describe the change"
git push

Commands you’ll use most:

For me:

git checkout codex/logic

For Claude UI work:

git checkout claude/ui

When you finish a batch of changes on either branch:

git add .
git commit -m "Describe the change"
git push
When you want both merged into live main:

git checkout main
git pull
git merge codex/logic
git merge claude/ui
git push






Rubik's Next Tasks:
1. Website security
2. I want to look at different apps that are like mine and edit them
3. I want to add different cubes to the app
4. I also want to play the cube in different dimensions, like make a 2D map game of it; 





