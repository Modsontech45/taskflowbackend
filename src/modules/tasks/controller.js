const prisma = require('../../config/prisma');

exports.createTask = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, notes, startAt, endAt } = req.body;

    const task = await prisma.task.create({
      data: {
        boardId,
        title,
        notes,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        createdById: req.user.id,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create Task Error:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

exports.listTasks = async (req, res) => {
  try {
    const { boardId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { boardId },
      orderBy: { startAt: 'asc' },
    });
    res.json(tasks);
  } catch (error) {
    console.error('List Tasks Error:', error);
    res.status(500).json({ message: 'Failed to list tasks' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    if (data.startAt) data.startAt = new Date(data.startAt);
    if (data.endAt) data.endAt = new Date(data.endAt);

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    res.json(task);
  } catch (error) {
    console.error('Update Task Error:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete Task Error:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
};

exports.toggleTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isNowDone = !task.isDone;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        isDone: isNowDone,
        doneAt: isNowDone ? new Date() : null,
        status: isNowDone ? "expired" : "pending",
      },
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Toggle Task Error:', error);
    res.status(500).json({ message: 'Failed to toggle task' });
  }
};
